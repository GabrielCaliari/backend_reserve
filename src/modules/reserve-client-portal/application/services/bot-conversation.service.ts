import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { ListConversationsQueryDto } from '../dtos/list-conversations-query.dto';
import { EFunnelStage } from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE } from '../../domain/enums/funnel-stage-groups';

/** §5.3 Bloco Conversas — read-only list/search/detail, deep-linked into Chatwoot (Decisao 11). */
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
        ...(query.from || query.to
          ? {
              last_message_at: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { last_message_at: 'desc' },
      take: 100,
    });

    const numeros = contacts.map((c) => c.numero_contato);
    const [leads, chatwootBaseUrl] = await Promise.all([
      numeros.length
        ? this.prisma.botLead.findMany({
            where: { tenant_id: tenantId, numero_contato: { in: numeros } },
          })
        : Promise.resolve([]),
      this.getChatwootBaseUrl(tenantId),
    ]);
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
        currentStage: leadByContact.get(c.numero_contato)?.current_stage ?? FUNNEL_ENTRY_STAGE,
        chatwootDeepLink: this.buildChatwootDeepLink(chatwootBaseUrl, c.numero_contato),
      })),
    };
  }

  async detail(clientId: string, numeroContato: string) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) throw new NotFoundException('Client has no linked tenant.');

    const contact = await this.prisma.botContact.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    if (!contact) throw new NotFoundException('Conversation not found.');

    const [messages, lead, chatwootBaseUrl] = await Promise.all([
      this.prisma.botMessage.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'asc' },
      }),
      this.prisma.botLead.findUnique({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
      }),
      this.getChatwootBaseUrl(tenantId),
    ]);

    return {
      contact: {
        numeroContato: contact.numero_contato,
        nome: contact.nome,
        statusBot: contact.status_bot,
        consentimentoLgpd: contact.consentimento_lgpd,
        tipoPublico: contact.tipo_publico,
        currentStage: lead?.current_stage ?? FUNNEL_ENTRY_STAGE,
        chatwootDeepLink: this.buildChatwootDeepLink(chatwootBaseUrl, contact.numero_contato),
      },
      messages: messages.map((m) => ({
        role: m.role,
        tipo: m.tipo,
        contentPreview: m.content_preview,
        ocorridoEm: m.ocorrido_em,
      })),
    };
  }

  private async resolveTenantId(clientId: string): Promise<string | null> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    return client?.tenant_id ?? null;
  }

  private async getChatwootBaseUrl(tenantId: string): Promise<string | null> {
    const config = await this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } });
    return config?.chatwoot_base_url ?? null;
  }

  /** Never a broken link: null when the tenant has no chatwoot_base_url configured. */
  private buildChatwootDeepLink(baseUrl: string | null, numeroContato: string): string | null {
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/$/, '')}/conversations?q=${encodeURIComponent(numeroContato)}`;
  }
}
