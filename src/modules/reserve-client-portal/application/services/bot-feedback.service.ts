import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  BOT_FEEDBACK_LIST_DEFAULT_LIMIT,
  BOT_FEEDBACK_LIST_MAX_LIMIT,
  BotFeedbackItemDto,
  BotFeedbackListQueryDto,
  BotFeedbackListResponseDto,
  BotFeedbackSummaryQueryDto,
  BotFeedbackSummaryResponseDto,
} from '../dtos/bot-feedback.dto';

const RESUMO_TOP = 3;

interface BotFeedbackRow {
  id: string;
  numero_contato: string;
  texto: string | null;
  resumo: string | null;
  nota: number | null;
  sentimento: string;
  check_out: Date | null;
  link_enviado: boolean;
  ocorrido_em: Date;
}

/** Tela "Feedbacks dos hospedes": leitura por cliente (hotel-portal). */
@Injectable()
export class BotFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(clientId: string): Promise<string | null> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    return client?.tenant_id ?? null;
  }

  private periodo(query: BotFeedbackSummaryQueryDto) {
    if (!query.from && !query.to) return {};
    return {
      ocorrido_em: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }

  async list(clientId: string, query: BotFeedbackListQueryDto): Promise<BotFeedbackListResponseDto> {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return { items: [], total: 0 };

    const where = {
      tenant_id: tenantId,
      ...this.periodo(query),
      ...(query.sentimento ? { sentimento: query.sentimento } : {}),
    };
    const limit = Math.min(Math.max(query.limit ?? BOT_FEEDBACK_LIST_DEFAULT_LIMIT, 1), BOT_FEEDBACK_LIST_MAX_LIMIT);
    const page = Math.max(query.page ?? 1, 1);

    const [rows, total] = await Promise.all([
      this.prisma.botFeedback.findMany({
        where,
        orderBy: { ocorrido_em: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.botFeedback.count({ where }),
    ]);
    const nomes = await this.nomesDosContatos(tenantId, rows);
    return { items: rows.map((r) => this.toItem(r, nomes)), total };
  }

  async summary(clientId: string, query: BotFeedbackSummaryQueryDto): Promise<BotFeedbackSummaryResponseDto> {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) {
      return { total: 0, porSentimento: { positivo: 0, neutro: 0, negativo: 0 }, notaMedia: null, melhores: [], piores: [] };
    }

    const where = { tenant_id: tenantId, ...this.periodo(query) };
    // Ordem alfabetica do sentimento: negativo < neutro < positivo. Sem nota vai sempre para o fim.
    const [grupos, media, melhores, piores] = await Promise.all([
      this.prisma.botFeedback.groupBy({ by: ['sentimento'], where, _count: { _all: true } }),
      this.prisma.botFeedback.aggregate({ where, _avg: { nota: true } }),
      this.prisma.botFeedback.findMany({
        where,
        orderBy: [{ sentimento: 'desc' }, { nota: { sort: 'desc', nulls: 'last' } }, { ocorrido_em: 'desc' }],
        take: RESUMO_TOP,
      }),
      this.prisma.botFeedback.findMany({
        where,
        orderBy: [{ sentimento: 'asc' }, { nota: { sort: 'asc', nulls: 'last' } }, { ocorrido_em: 'desc' }],
        take: RESUMO_TOP,
      }),
    ]);

    const porSentimento = { positivo: 0, neutro: 0, negativo: 0 };
    for (const g of grupos) {
      if (g.sentimento in porSentimento) {
        porSentimento[g.sentimento as keyof typeof porSentimento] = (g._count as { _all: number })._all;
      }
    }
    const total = porSentimento.positivo + porSentimento.neutro + porSentimento.negativo;
    const nomes = await this.nomesDosContatos(tenantId, [...melhores, ...piores]);
    const avg = media._avg.nota;
    return {
      total,
      porSentimento,
      notaMedia: avg == null ? null : Math.round(avg * 10) / 10,
      melhores: melhores.map((r) => this.toItem(r, nomes)),
      piores: piores.map((r) => this.toItem(r, nomes)),
    };
  }

  private async nomesDosContatos(tenantId: string, rows: BotFeedbackRow[]): Promise<Map<string, string | null>> {
    const numeros = [...new Set(rows.map((r) => r.numero_contato))];
    if (!numeros.length) return new Map();
    const contatos = await this.prisma.botContact.findMany({
      where: { tenant_id: tenantId, numero_contato: { in: numeros } },
      select: { numero_contato: true, nome: true },
    });
    return new Map(contatos.map((c) => [c.numero_contato, c.nome]));
  }

  private toItem(r: BotFeedbackRow, nomes: Map<string, string | null>): BotFeedbackItemDto {
    return {
      id: r.id,
      numeroContato: r.numero_contato,
      nomeContato: nomes.get(r.numero_contato) ?? null,
      texto: r.texto,
      resumo: r.resumo,
      nota: r.nota,
      sentimento: r.sentimento,
      checkOut: r.check_out ? r.check_out.toISOString().slice(0, 10) : null,
      linkEnviado: r.link_enviado,
      ocorridoEm: r.ocorrido_em,
    };
  }
}
