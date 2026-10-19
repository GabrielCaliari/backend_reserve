import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { DetailConversationQueryDto, ListConversationsQueryDto } from '../dtos/list-conversations-query.dto';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE } from '../../domain/enums/funnel-stage-groups';

const DETAIL_DEFAULT_LIMIT = 200;

/** §5.3 Bloco Conversas — somente leitura; o atendimento humano acontece no WhatsApp Business da pousada (contrato v2 §1.1). */
@Injectable()
export class BotConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string, query: ListConversationsQueryDto) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return { conversations: [] };

    const contacts = await this.prisma.botContact.findMany({
      where: {
        tenant_id: tenantId,
        ...(query.search
          ? {
              OR: [
                { numero_contato: { contains: query.search } },
                { nome: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.audience ? { tipo_publico: query.audience as EBotContactAudience } : {}),
        ...(query.from || query.to
          ? {
              last_message_at: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      // Contato sem mensagem (last_message_at null) vai pro fim: no Postgres o
      // desc poe NULL primeiro e esses contatos ficariam no topo da caixa de entrada.
      orderBy: { last_message_at: { sort: 'desc', nulls: 'last' } },
      take: 100,
    });

    const numeros = contacts.map((c) => c.numero_contato);
    const leads = numeros.length
      ? await this.prisma.botLead.findMany({
          where: { tenant_id: tenantId, numero_contato: { in: numeros } },
        })
      : [];
    const leadByContact = new Map(leads.map((l) => [l.numero_contato, l]));

    const filtered = query.stage
      ? contacts.filter(
          (c) => leadByContact.get(c.numero_contato)?.current_stage === (query.stage as EFunnelStage),
        )
      : contacts;

    return {
      conversations: filtered.map((c) => ({
        numeroContato: c.numero_contato,
        nome: c.nome,
        statusBot: c.status_bot,
        lastMessageAt: c.last_message_at,
        consentimentoLgpd: c.consentimento_lgpd,
        tipoPublico: c.tipo_publico,
        origem: c.origem ?? null,
        sourceId: c.source_id ?? null,
        currentStage: leadByContact.get(c.numero_contato)?.current_stage ?? FUNNEL_ENTRY_STAGE,
        whatsappWebLink: this.whatsappWebLink(c.numero_contato),
      })),
    };
  }

  /**
   * Conversa inteira (texto completo em `content`; `contentPreview` e a previa da lista).
   * Pagina de tras pra frente: traz as `limit` mais recentes (antes de `before`) em ordem asc.
   */
  async detail(clientId: string, numeroContato: string, query: DetailConversationQueryDto = {}) {
    const limit = query.limit ?? DETAIL_DEFAULT_LIMIT;
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) throw new NotFoundException('Client has no linked tenant.');

    const contact = await this.prisma.botContact.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    if (!contact) throw new NotFoundException('Conversation not found.');

    const [messages, lead] = await Promise.all([
      this.prisma.botMessage.findMany({
        where: {
          tenant_id: tenantId,
          numero_contato: numeroContato,
          ...(query.before ? { ocorrido_em: { lt: new Date(query.before) } } : {}),
        },
        orderBy: { ocorrido_em: 'desc' },
        take: limit + 1,
      }),
      this.prisma.botLead.findUnique({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
      }),
    ]);

    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).reverse();

    return {
      contact: {
        numeroContato: contact.numero_contato,
        nome: contact.nome,
        statusBot: contact.status_bot,
        lastMessageAt: contact.last_message_at,
        consentimentoLgpd: contact.consentimento_lgpd,
        tipoPublico: contact.tipo_publico,
        origem: contact.origem ?? null,
        sourceId: contact.source_id ?? null,
        currentStage: lead?.current_stage ?? FUNNEL_ENTRY_STAGE,
        whatsappWebLink: this.whatsappWebLink(contact.numero_contato),
        ocasiao: contact.ocasiao ?? null,
        hold: this.holdResumo(lead),
      },
      messages: page.map((m) => ({
        role: m.role,
        tipo: m.tipo,
        contentPreview: m.content_preview,
        content: m.content ?? null,
        mediaKind: m.media_kind ?? null,
        mediaText: m.media_text ?? null,
        caption: m.caption ?? null,
        ocorridoEm: m.ocorrido_em,
      })),
      hasMore,
    };
  }

  private async resolveTenantId(clientId: string): Promise<string | null> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    return client?.tenant_id ?? null;
  }

  /** Abre a conversa no WhatsApp Web da conta logada — a da pousada (contrato v2 §4.1). */
  private whatsappWebLink(numeroContato: string): string {
    return `https://web.whatsapp.com/send?phone=${numeroContato.replace(/\D/g, '')}`;
  }

  private holdResumo(
    lead: {
      hold_codigo?: string | null;
      hold_status?: string | null;
      hold_valor_cents?: number | null;
      acomodacao_interesse?: string | null;
      datas_interesse?: unknown;
    } | null,
  ) {
    if (!lead || (!lead.hold_codigo && !lead.hold_status)) return null;
    const datas = (lead.datas_interesse ?? {}) as { checkin?: unknown; checkout?: unknown };
    return {
      codigo: lead.hold_codigo ?? null,
      status: lead.hold_status ?? null,
      acomodacao: lead.acomodacao_interesse ?? null,
      checkIn: typeof datas.checkin === 'string' ? datas.checkin : null,
      checkOut: typeof datas.checkout === 'string' ? datas.checkout : null,
      valor: lead.hold_valor_cents == null ? null : lead.hold_valor_cents / 100,
    };
  }
}
