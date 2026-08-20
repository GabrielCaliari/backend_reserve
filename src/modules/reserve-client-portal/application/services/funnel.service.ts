import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';
import { FUNNEL_ENTRY_STAGE, FUNNEL_LOST_STAGE } from '../../domain/enums/funnel-stage-groups';
import { BotStageWebhookProvider } from '../../infrastructure/providers/bot-stage-webhook.provider';

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
    private readonly botStageWebhookProvider: BotStageWebhookProvider,
  ) {}

  async moveStage(
    tenantId: string,
    numeroContato: string,
    paraEstagio: EFunnelStage,
    adminId: string,
    motivo?: string,
    tipoPublico?: EBotContactAudience,
  ) {
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
        create: { tenant_id: tenantId, numero_contato: numeroContato, current_stage: paraEstagio },
        update: { current_stage: paraEstagio },
      }),
    ]);

    // Fire-and-forget: BotStageWebhookProvider never throws, but the .catch
    // here is documented defense-in-depth, matching whatsapp-tracking.service
    // .ts's own comment on the same pattern — a human just moved a lead in
    // the painel and that action must succeed regardless of N8N's
    // reachability.
    this.botStageWebhookProvider.dispatch(tenantId, funnelEvent.id).catch(() => {});

    return funnelEvent;
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
  ) {
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
    ];
    if (paraEstagio !== currentStage) {
      ops.push(
        this.prisma.botLead.upsert({
          where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
          create: { tenant_id: tenantId, numero_contato: numeroContato, current_stage: paraEstagio },
          update: { current_stage: paraEstagio },
        }),
      );
    }
    const results = await this.prisma.$transaction(ops);
    const funnelEvent = results[1];

    this.botStageWebhookProvider.dispatch(tenantId, funnelEvent.id).catch(() => {});

    return funnelEvent;
  }
}

/** Marcador do evento de retomada — o N8N e as metricas fazem branch nele. */
export const RETOMADA_HUMANA_MOTIVO = 'RETOMADA_HUMANA';
