import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttributionService } from './attribution.service';
import { BotEventDto } from '../dtos/bot-event.dto';
import {
  EBotContactAudience,
  EBotContactStatus,
  EBotMessageType,
  EFunnelStage,
} from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE } from '../../domain/enums/funnel-stage-groups';

const CONTENT_PREVIEW_MAX_LENGTH = 280;

/**
 * Nomes antigos das etapas (funil v1) aceitos na ingestao. O N8N e um sistema
 * externo e nao sobe junto com o backend: sem esses aliases, um evento com
 * 'PAGAMENTO' cairia no fallback e jogaria o lead de volta para o inicio do
 * funil -- um retrocesso silencioso, pior que um evento ignorado. Mesmo
 * mapeamento da migration.
 */
const LEGACY_STAGE_ALIASES: Record<string, EFunnelStage> = {
  NOVO: EFunnelStage.CONTATO_INICIADO,
  PAGAMENTO: EFunnelStage.FECHAMENTO_INICIADO,
  FECHADO: EFunnelStage.RESERVA_CONFIRMADA,
  FRIO: EFunnelStage.PERDIDO,
};

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
          payload.motivo as string | undefined,
          this.parseAudience(payload.tipo_publico),
        );
      case 'lead.pronto_para_fechar':
        return this.handleProntoParaFechar(tenantId, String(payload.contato ?? ''), occurredAt);
      case 'pagamento.solicitado':
        return this.moveStage(
          tenantId,
          String(payload.contato ?? ''),
          EFunnelStage.FECHAMENTO_INICIADO,
          occurredAt,
        );
      case 'lead.fechado':
        return this.moveStage(
          tenantId,
          String(payload.contato ?? ''),
          EFunnelStage.RESERVA_CONFIRMADA,
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
    tipoPublico?: EBotContactAudience,
  ): Promise<void> {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const deEstagio = currentLead?.current_stage ?? FUNNEL_ENTRY_STAGE;

    // O subtipo de publico e atributo do contato, entao vive fora do log
    // append-only de estagios. So sobrescreve quando o bot manda um valor
    // valido -- evento sem tipo_publico nao apaga o que ja foi identificado.
    if (tipoPublico) {
      await this.prisma.botContact.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { tipo_publico: tipoPublico },
      });
    }

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
   * lead.estagio_alterado, mas nenhuma das 9 etapas do funil v2 e "pronto para
   * fechar" -- §3.3 amarra o conceito a tag [TRANSFERIR]. Continua tratado
   * aqui como evento de anotacao que nao muda estagio (de_estagio: null,
   * para_estagio: o estagio atual inalterado) carregando motivo:
   * 'TRANSFERIR', em vez de inventar uma decima etapa.
   *
   * Nao confundir com FECHAMENTO_INICIADO: aquele e o estagio para onde
   * 'pagamento.solicitado' move o lead; este e so um marcador de handoff.
   */
  private async handleProntoParaFechar(
    tenantId: string,
    numeroContato: string,
    occurredAt: Date,
  ): Promise<void> {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const currentStage = currentLead?.current_stage ?? FUNNEL_ENTRY_STAGE;

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
    const parsed =
      (EFunnelStage as Record<string, EFunnelStage>)[stage] ?? LEGACY_STAGE_ALIASES[stage];
    if (parsed) return parsed;

    // Estagio desconhecido cai na entrada do funil (comportamento historico),
    // mas agora com log: com 9 etapas um fallback silencioso e facil de
    // confundir com um lead que de fato nao avancou.
    this.logger.warn(`Unknown funnel stage "${stage}" — usando ${FUNNEL_ENTRY_STAGE}`);
    return FUNNEL_ENTRY_STAGE;
  }

  private parseAudience(value: unknown): EBotContactAudience | undefined {
    if (value === null || value === undefined) return undefined;
    const audience = String(value).toUpperCase().replace(/[\s-]+/g, '_');
    return (EBotContactAudience as Record<string, EBotContactAudience>)[audience] ?? undefined;
  }
}
