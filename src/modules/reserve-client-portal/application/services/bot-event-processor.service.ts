import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionService } from './attribution.service';
import { BotEventDto } from '../dtos/bot-event.dto';
import {
  EBotContactStatus,
  EBotMessageType,
  EFunnelStage,
} from '../../../../generated/prisma/enums';

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
      case 'lead.estagio_alterado':
        return this.moveStage(
          tenantId,
          String(payload.contato ?? ''),
          this.parseStage(payload.para),
          occurredAt,
        );
      case 'lead.pronto_para_fechar':
        return this.handleProntoParaFechar(tenantId, String(payload.contato ?? ''), occurredAt);
      case 'pagamento.solicitado':
        return this.moveStage(
          tenantId,
          String(payload.contato ?? ''),
          EFunnelStage.PAGAMENTO,
          occurredAt,
        );
      case 'lead.fechado':
        return this.moveStage(
          tenantId,
          String(payload.contato ?? ''),
          EFunnelStage.FECHADO,
          occurredAt,
        );
      case 'bot.pausado':
        return this.handleBotPause(tenantId, payload, true);
      case 'bot.reativado':
        return this.handleBotPause(tenantId, payload, false);
      case 'sistema.heartbeat':
        return this.handleHeartbeat(tenantId, occurredAt);
      case 'followup.enviado':
        return this.handleFollowupEnviado(tenantId, payload, occurredAt);
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

  /**
   * lead.estagio_alterado / pagamento.solicitado / lead.fechado all share the
   * same append-only-log write shape: one FunnelEvent row (de_estagio: the
   * lead's current cached stage, para_estagio: the new one) plus a BotLead
   * upsert to keep the read projection in sync — both writes in a single
   * $transaction, which is the append-only invariant's enforcement point.
   */
  private async moveStage(
    tenantId: string,
    numeroContato: string,
    paraEstagio: EFunnelStage,
    occurredAt: Date,
    motivo?: string,
  ): Promise<void> {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const deEstagio = currentLead?.current_stage ?? EFunnelStage.NOVO;

    await this.prisma.$transaction([
      this.prisma.funnelEvent.create({
        data: {
          tenant_id: tenantId,
          numero_contato: numeroContato,
          de_estagio: deEstagio,
          para_estagio: paraEstagio,
          autor_tipo: 'bot',
          motivo: motivo ?? null,
          ocorrido_em: occurredAt,
        },
      }),
      this.prisma.botLead.upsert({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
        create: { tenant_id: tenantId, numero_contato: numeroContato, current_stage: paraEstagio },
        update: { current_stage: paraEstagio },
      }),
    ]);
  }

  /**
   * §5.6 lists lead.pronto_para_fechar as a distinct event from
   * lead.estagio_alterado, but §5.4's stage list (NOVO/QUALIFICADO/PAGAMENTO/
   * FECHADO/FRIO) has no "pronto para fechar" stage and §3.3 ties the concept
   * to the [TRANSFERIR] tag instead. Treated here as a non-stage-changing
   * annotation event (de_estagio: null, para_estagio: the lead's current
   * stage unchanged) carrying motivo: 'TRANSFERIR', rather than inventing a
   * sixth EFunnelStage value the master doc never lists. Flagged as a
   * product decision in the plan's final report.
   */
  private async handleProntoParaFechar(
    tenantId: string,
    numeroContato: string,
    occurredAt: Date,
  ): Promise<void> {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const currentStage = currentLead?.current_stage ?? EFunnelStage.NOVO;

    await this.prisma.funnelEvent.create({
      data: {
        tenant_id: tenantId,
        numero_contato: numeroContato,
        de_estagio: null,
        para_estagio: currentStage,
        autor_tipo: 'bot',
        motivo: 'TRANSFERIR',
        ocorrido_em: occurredAt,
      },
    });
  }

  private async handleBotPause(
    tenantId: string,
    payload: Record<string, unknown>,
    paused: boolean,
  ): Promise<void> {
    const numeroContato = String(payload.contato ?? '');
    await this.prisma.botContact.updateMany({
      where: { tenant_id: tenantId, numero_contato: numeroContato },
      data: {
        status_bot: paused ? EBotContactStatus.PAUSADO : EBotContactStatus.ATIVO,
        motivo_pausa: paused ? ((payload.motivo as string) ?? null) : null,
      },
    });
  }

  private async handleHeartbeat(tenantId: string, occurredAt: Date): Promise<void> {
    // Heartbeat events can arrive slightly delayed — store what N8N reported
    // (event.occurred_at), not now(), so staleness checks (Task 8) reflect
    // the bot's actual last-seen time.
    await this.prisma.botIntegrationConfig.updateMany({
      where: { tenant_id: tenantId },
      data: { last_heartbeat_at: occurredAt },
    });
  }

  private async handleFollowupEnviado(
    tenantId: string,
    payload: Record<string, unknown>,
    occurredAt: Date,
  ): Promise<void> {
    await this.prisma.followupAttempt.create({
      data: {
        tenant_id: tenantId,
        numero_contato: String(payload.contato ?? ''),
        tentativa: Number(payload.tentativa ?? 1),
        tipo_janela: String(payload.tipo_janela ?? ''),
        status: String(payload.status ?? 'AGUARDANDO'),
        ocorrido_em: occurredAt,
      },
    });
  }

  private parseStage(value: unknown): EFunnelStage {
    const stage = String(value ?? '').toUpperCase();
    return (EFunnelStage as Record<string, EFunnelStage>)[stage] ?? EFunnelStage.NOVO;
  }
}
