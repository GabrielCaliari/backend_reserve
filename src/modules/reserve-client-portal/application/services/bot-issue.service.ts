import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  BOT_ISSUE_LIST_DEFAULT_LIMIT,
  BOT_ISSUE_LIST_MAX_LIMIT,
  BotIssueDetailResponseDto,
  BotIssueItemDto,
  BotIssueListQueryDto,
  BotIssueListResponseDto,
  BotIssueStatus,
  BotIssueSummaryQueryDto,
  BotIssueSummaryResponseDto,
  BotIssueUltimaMensagemDto,
} from '../dtos/bot-issue.dto';

const RESUMO_TOP = 10;

interface BotIssueRow {
  id: string;
  numero_contato: string | null;
  categoria: string;
  codigo: string;
  gravidade: string;
  workflow: string | null;
  no: string | null;
  etapa: string | null;
  mensagem: string | null;
  mensagem_hospede: string | null;
  resposta_bot: string | null;
  contexto: unknown;
  socorro: boolean;
  status: string;
  ocorrido_em: Date;
}

/** Tela "Erros do bot": leitura por cliente (hotel-portal) e triagem de status pelo admin. */
@Injectable()
export class BotIssueService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(clientId: string): Promise<string | null> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    return client?.tenant_id ?? null;
  }

  private periodo(query: BotIssueSummaryQueryDto) {
    if (!query.from && !query.to) return {};
    return {
      ocorrido_em: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }

  async list(clientId: string, query: BotIssueListQueryDto): Promise<BotIssueListResponseDto> {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return { items: [], total: 0 };

    const where = {
      tenant_id: tenantId,
      ...this.periodo(query),
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.codigo ? { codigo: query.codigo } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const limit = Math.min(Math.max(query.limit ?? BOT_ISSUE_LIST_DEFAULT_LIMIT, 1), BOT_ISSUE_LIST_MAX_LIMIT);
    const page = Math.max(query.page ?? 1, 1);

    const [rows, total] = await Promise.all([
      this.prisma.botIssue.findMany({
        where,
        orderBy: { ocorrido_em: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.botIssue.count({ where }),
    ]);
    const nomes = await this.nomesDosContatos(tenantId, rows);
    return { items: rows.map((r) => this.toItem(r, nomes)), total };
  }

  async summary(clientId: string, query: BotIssueSummaryQueryDto): Promise<BotIssueSummaryResponseDto> {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return { total: 0, porCodigo: [] };

    const where = { tenant_id: tenantId, ...this.periodo(query) };
    const [grupos, total] = await Promise.all([
      this.prisma.botIssue.groupBy({
        by: ['codigo', 'categoria'],
        where,
        _count: { _all: true },
        orderBy: { _count: { codigo: 'desc' } },
        take: RESUMO_TOP,
      }),
      this.prisma.botIssue.count({ where }),
    ]);
    return {
      total,
      porCodigo: grupos.map((g) => ({
        codigo: g.codigo,
        categoria: g.categoria,
        quantidade: (g._count as { _all: number })._all,
      })),
    };
  }

  async detail(clientId: string, id: string): Promise<BotIssueDetailResponseDto> {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) throw new NotFoundException('erro do bot nao encontrado.');

    const row = await this.prisma.botIssue.findFirst({ where: { id, tenant_id: tenantId } });
    if (!row) throw new NotFoundException('erro do bot nao encontrado.');

    const nomes = await this.nomesDosContatos(tenantId, [row]);
    const contexto = row.contexto && typeof row.contexto === 'object' && !Array.isArray(row.contexto)
      ? (row.contexto as Record<string, unknown>)
      : {};
    return {
      ...this.toItem(row, nomes),
      mensagemHospede: row.mensagem_hospede,
      respostaBot: row.resposta_bot,
      ultimasMensagens: this.ultimasMensagens(contexto.ultimas_mensagens),
      url: typeof contexto.url === 'string' && contexto.url ? contexto.url : null,
    };
  }

  async updateStatus(tenantId: string, id: string, status: BotIssueStatus): Promise<BotIssueItemDto> {
    const atual = await this.prisma.botIssue.findFirst({ where: { id, tenant_id: tenantId } });
    if (!atual) throw new NotFoundException('erro do bot nao encontrado.');

    const row = await this.prisma.botIssue.update({ where: { id }, data: { status } });
    const nomes = await this.nomesDosContatos(tenantId, [row]);
    return this.toItem(row, nomes);
  }

  private async nomesDosContatos(tenantId: string, rows: BotIssueRow[]): Promise<Map<string, string | null>> {
    const numeros = [...new Set(rows.map((r) => r.numero_contato).filter((n): n is string => !!n))];
    if (!numeros.length) return new Map();
    const contatos = await this.prisma.botContact.findMany({
      where: { tenant_id: tenantId, numero_contato: { in: numeros } },
      select: { numero_contato: true, nome: true },
    });
    return new Map(contatos.map((c) => [c.numero_contato, c.nome]));
  }

  /** O bot manda a lista livre em contexto.ultimas_mensagens; so passa o que tem o formato esperado. */
  private ultimasMensagens(raw: unknown): BotIssueUltimaMensagemDto[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .filter((x) => typeof x.m === 'string' && typeof x.em === 'string' && typeof x.quem === 'string')
      .map((x) => ({ m: x.m as string, em: x.em as string, quem: x.quem as string }));
  }

  private toItem(r: BotIssueRow, nomes: Map<string, string | null>): BotIssueItemDto {
    return {
      id: r.id,
      numeroContato: r.numero_contato,
      nomeContato: r.numero_contato ? nomes.get(r.numero_contato) ?? null : null,
      categoria: r.categoria,
      codigo: r.codigo,
      gravidade: r.gravidade,
      etapa: r.etapa,
      workflow: r.workflow,
      no: r.no,
      mensagem: r.mensagem,
      socorro: r.socorro,
      status: r.status,
      ocorridoEm: r.ocorrido_em,
    };
  }
}
