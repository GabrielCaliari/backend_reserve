import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EFunnelStage } from '../../../../generated/prisma/enums';
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
  ) {
    const currentLead = await this.prisma.botLead.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    const currentStage = currentLead?.current_stage ?? EFunnelStage.NOVO;

    if (currentStage === paraEstagio) {
      // Moving to the same stage is a no-op the UI shouldn't allow — a
      // same-stage FunnelEvent would break "tempo médio por estágio"'s
      // assumption that consecutive events differ.
      throw new BadRequestException('Lead is already in this stage.');
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
          motivo: motivo ?? null,
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
}
