import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionService } from './attribution.service';
import { BotEventDto } from '../dtos/bot-event.dto';
import { EBotMessageType } from '../../../../generated/prisma/enums';

const CONTENT_PREVIEW_MAX_LENGTH = 280;

/**
 * Fans out POST /api/ingest/bot-events into BotContact/BotMessage/
 * ConversationAttribution (this task) and FunnelEvent/BotLead/pause/heartbeat/
 * follow-up (extended by Fase 3 Task 5) — the split matches how §5.6's event
 * catalog itself groups them, keeping each addition's diff focused.
 */
@Injectable()
export class BotEventProcessorService {
  private readonly logger = new Logger(BotEventProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attributionService: AttributionService,
  ) {}

  async process(tenantId: string, event: BotEventDto): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const occurredAt = new Date(event.occurred_at);

    switch (event.event_type) {
      case 'conversa.iniciada':
        return this.handleConversaIniciada(tenantId, payload, occurredAt);
      case 'mensagem.recebida':
        return this.handleMensagem(tenantId, payload, occurredAt, 'user');
      case 'mensagem.enviada':
        return this.handleMensagem(tenantId, payload, occurredAt, 'assistant');
      default:
        return this.handleUnknown(tenantId, event.event_type);
    }
  }

  private async handleConversaIniciada(
    tenantId: string,
    payload: Record<string, unknown>,
    occurredAt: Date,
  ): Promise<void> {
    const numeroContato = String(payload.contato ?? '');
    const sourceType = payload.source_type as string | undefined;
    const ctwaClid = payload.ctwa_clid as string | undefined;
    const origem = sourceType === 'ad' || ctwaClid ? 'anuncio' : 'organico';

    await this.prisma.botContact.upsert({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
      create: {
        tenant_id: tenantId,
        numero_contato: numeroContato,
        nome: (payload.nome as string) ?? null,
        origem,
        last_message_at: occurredAt,
      },
      update: {
        last_message_at: occurredAt,
        origem,
      },
    });

    await this.attributionService.record(tenantId, {
      numeroContato,
      ocorridoEm: occurredAt,
      ctwaClid,
      sourceId: payload.source_id as string | undefined,
      sourceType,
      sourceUrl: payload.source_url as string | undefined,
      linkCode: payload.link_code as string | undefined,
      utmSource: payload.utm_source as string | undefined,
      utmMedium: payload.utm_medium as string | undefined,
      utmCampaign: payload.utm_campaign as string | undefined,
    });
  }

  private async handleMensagem(
    tenantId: string,
    payload: Record<string, unknown>,
    occurredAt: Date,
    role: 'user' | 'assistant',
  ): Promise<void> {
    const numeroContato = String(payload.contato ?? '');
    const rawContent = String(payload.content ?? payload.texto ?? '');
    const tipo = (payload.tipo as EBotMessageType) ?? EBotMessageType.texto;

    await this.prisma.botMessage.create({
      data: {
        tenant_id: tenantId,
        numero_contato: numeroContato,
        role,
        tipo,
        // Defense in depth for the LGPD constraint: truncate server-side
        // regardless of what N8N sends, never the full transcript.
        content_preview: rawContent.slice(0, CONTENT_PREVIEW_MAX_LENGTH),
        ocorrido_em: occurredAt,
      },
    });

    await this.prisma.botContact.updateMany({
      where: { tenant_id: tenantId, numero_contato: numeroContato },
      data: { last_message_at: occurredAt },
    });
  }

  private handleUnknown(tenantId: string, eventType: string): void {
    // Global Constraints: malformed/unknown event_type is logged and
    // acknowledged 202 — never thrown, never retried (a retried schema
    // mismatch never succeeds).
    this.logger.warn(`Unknown bot event_type "${eventType}" (tenant=${tenantId})`);
  }
}
