import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE, FUNNEL_LOST_STAGE } from '../../domain/enums/funnel-stage-groups';
import { BotPanelActionProvider, PanelActionResult } from '../../infrastructure/providers/bot-panel-action.provider';

/** Evento do funil + resultado da entrega ao bot (`ok: false` = bot nao avisado). */
export type FunnelEventActionResult = Record<string, unknown> & PanelActionResult;

/** Motivos de perda do contrato v2 (§3.5, evento `perdido`). */
export const MOTIVOS_PERDA = ['caro', 'data', 'pesquisando', 'sumiu', 'outro'] as const;

/**
 * Human-authored funnel stage moves (§5.4 "sincronização de volta"). Writes
 * the same append-only FunnelEvent log as the bot-authored path
 * (BotEventProcessorService.moveStage), then fires a best-effort reverse
 * webhook to N8N so the bot's own state mirrors the painel — the log, not
 * the outbound call, remains the source of truth if delivery fails.
 */
@Injectable()
export class FunnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly panelActions: BotPanelActionProvider,
  ) {}

  async moveStage(
    tenantId: string,
    numeroContato: string,
    paraEstagio: EFunnelStage,
    adminId: string,
    motivo?: string,
    tipoPublico?: EBotContactAudience,
  ): Promise<FunnelEventActionResult> {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const currentStage = currentLead?.current_stage ?? FUNNEL_ENTRY_STAGE;

    // Motivo obrigatorio no PERDIDO. Duplicado em relacao ao
    // FunnelStageChangeDto de proposito: o DTO so protege a entrada HTTP, e
    // este service tambem e chamado fora do controller. O banco continua
    // aceitando motivo NULL porque o historico migrado de FRIO nao tem como
    // preencher esse campo retroativamente.
    // `|| undefined` e nao so `.trim()`: motivo so de espacos fora do PERDIDO
    // seria gravado como string vazia (o `?? null` la embaixo nao pega ''),
    // criando uma segunda representacao de "sem motivo" na coluna. Mesma
    // normalizacao do caminho do bot em BotEventProcessorService.moveStage.
    const motivoLimpo = motivo?.trim() || undefined;
    if (paraEstagio === FUNNEL_LOST_STAGE && !motivoLimpo) {
      throw new BadRequestException('motivo e obrigatorio ao mover um lead para PERDIDO.');
    }
    if (paraEstagio === FUNNEL_LOST_STAGE && !(MOTIVOS_PERDA as readonly string[]).includes(motivoLimpo!)) {
      throw new BadRequestException(`motivo de perda invalido: use um de ${MOTIVOS_PERDA.join(', ')}.`);
    }

    if (currentStage === paraEstagio) {
      // Moving to the same stage is a no-op the UI shouldn't allow — a
      // same-stage FunnelEvent would break "tempo médio por estágio"'s
      // assumption that consecutive events differ.
      throw new BadRequestException('Lead is already in this stage.');
    }

    // Atributo do contato, fora do log append-only de estagios. Sem valor
    // novo, o subtipo ja identificado antes e preservado.
    if (tipoPublico) {
      await this.prisma.botContact.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { tipo_publico: tipoPublico },
      });
    }

    const [funnelEvent] = await this.prisma.$transaction([
      this.prisma.funnelEvent.create({
        data: {
          tenant_id: tenantId,
          numero_contato: numeroContato,
          de_estagio: currentStage,
          para_estagio: paraEstagio,
          autor_tipo: 'humano',
          autor_id: adminId,
          motivo: motivoLimpo ?? null,
          ocorrido_em: new Date(),
        },
      }),
      this.prisma.botLead.upsert({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
        create: {
          tenant_id: tenantId, numero_contato: numeroContato, current_stage: paraEstagio,
          stage_em: new Date(),
          ...(paraEstagio === FUNNEL_LOST_STAGE ? { motivo_perda: motivoLimpo } : {}),
        },
        update: {
          current_stage: paraEstagio,
          stage_em: new Date(),
          ...(paraEstagio === FUNNEL_LOST_STAGE ? { motivo_perda: motivoLimpo } : {}),
        },
      }),
    ]);

    // A acao do humano ja valeu no painel. O provider grava a linha no outbox
    // e o cron reconcilia se o bot estiver fora do ar; o resultado vai junto na
    // resposta (`ok: false` = acao registrada, bot nao avisado agora).
    const result = await (paraEstagio === FUNNEL_LOST_STAGE
      ? this.panelActions.dispatch(tenantId, 'mark_lost', {
          phone: numeroContato, actorId: adminId, payload: { reason: motivoLimpo },
        })
      : this.panelActions.dispatch(tenantId, 'move_stage', {
          phone: numeroContato, actorId: adminId, payload: { stage: paraEstagio, reason: motivoLimpo ?? null },
        }));

    return { ...funnelEvent, ok: result.ok, state: result.state };
  }

  /**
   * Retomada humana de conversa pausada: despausa o contato (independente de
   * estagio), registra QUEM assumiu no log de eventos (autor_id) e devolve o
   * lead ao estagio pedido. O webhook de estagio (ledger com retry) avisa o
   * N8N com motivo RETOMADA_HUMANA — e o gatilho para o fluxo do bot voltar a
   * responder este contato.
   *
   * Quando o estagio nao muda, o evento sai com de == para — quebra consciente
   * da premissa "eventos consecutivos diferem" do tempo-medio-por-estagio, em
   * troca da auditoria de quem retomou e da notificacao ao N8N pelo unico
   * canal com retry. O motivo fixo RETOMADA_HUMANA permite filtrar esses
   * eventos nas metricas se um dia distorcerem.
   */
  async resumeConversation(
    tenantId: string,
    numeroContato: string,
    adminId: string,
    estagio?: EFunnelStage,
  ): Promise<FunnelEventActionResult> {
    const contact = await this.prisma.botContact.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    if (!contact) throw new NotFoundException('contato nao encontrado.');

    const lead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const currentStage = lead?.current_stage ?? FUNNEL_ENTRY_STAGE;
    const paraEstagio = estagio ?? currentStage;

    const ops: any[] = [
      this.prisma.botContact.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { status_bot: 'ATIVO', motivo_pausa: null },
      }),
      this.prisma.funnelEvent.create({
        data: {
          tenant_id: tenantId,
          numero_contato: numeroContato,
          de_estagio: currentStage,
          para_estagio: paraEstagio,
          autor_tipo: 'humano',
          autor_id: adminId,
          motivo: RETOMADA_HUMANA_MOTIVO,
          ocorrido_em: new Date(),
        },
      }),
      // A equipe assumiu e devolveu ao bot: sai a etiqueta SOCORRO do card.
      this.prisma.botLead.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { socorro_em: null },
      }),
    ];
    if (paraEstagio !== currentStage) {
      ops.push(
        this.prisma.botLead.upsert({
          where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
          create: { tenant_id: tenantId, numero_contato: numeroContato, current_stage: paraEstagio, stage_em: new Date() },
          update: { current_stage: paraEstagio, stage_em: new Date() },
        }),
      );
    }
    const results = await this.prisma.$transaction(ops);
    const funnelEvent = results[1];

    // Mesmo contrato das outras acoes humanas: `ok: false` quando o bot nao foi
    // avisado (a acao fica no outbox e o cron reenvia).
    let result = await this.panelActions.dispatch(tenantId, 'return_to_bot', { phone: numeroContato, actorId: adminId });
    if (paraEstagio !== currentStage) {
      const moved = await this.panelActions.dispatch(tenantId, 'move_stage', {
        phone: numeroContato, actorId: adminId,
        payload: { stage: paraEstagio, reason: RETOMADA_HUMANA_MOTIVO },
      });
      result = { ok: result.ok && moved.ok, state: moved.state ?? result.state };
    }

    return { ...funnelEvent, ok: result.ok, state: result.state };
  }

  /**
   * "Assumir conversa": o humano pausa o bot para aquele contato. Aqui a
   * resposta do bot interessa a quem clicou, entao o dispatch e aguardado.
   */
  async pauseConversation(
    tenantId: string,
    numeroContato: string,
    adminId: string,
    motivo?: string,
  ): Promise<PanelActionResult> {
    const contact = await this.prisma.botContact.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    if (!contact) throw new NotFoundException('contato nao encontrado.');

    const motivoLimpo = motivo?.trim().slice(0, 255) || null;
    await this.prisma.botContact.updateMany({
      where: { tenant_id: tenantId, numero_contato: numeroContato },
      data: { status_bot: 'PAUSADO', motivo_pausa: motivoLimpo },
    });
    return this.panelActions.dispatch(tenantId, 'pause_bot', {
      phone: numeroContato, actorId: adminId, payload: { reason: motivoLimpo },
    });
  }

  /** Soma minutos ao prazo do hold que esta AGUARDANDO (contrato v2 §5.1). */
  async extendHold(
    tenantId: string,
    numeroContato: string,
    adminId: string,
    minutos = 60,
    codigo?: string,
  ): Promise<PanelActionResult> {
    return this.panelActions.dispatch(tenantId, 'extend_hold', {
      phone: numeroContato,
      actorId: adminId,
      payload: { minutes: minutos, ...(codigo ? { codigo } : {}) },
    });
  }
}

/** Marcador do evento de retomada — o N8N e as metricas fazem branch nele. */
export const RETOMADA_HUMANA_MOTIVO = 'RETOMADA_HUMANA';
