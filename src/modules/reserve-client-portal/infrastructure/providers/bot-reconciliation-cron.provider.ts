import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotStageWebhookProvider } from './bot-stage-webhook.provider';

const MAX_ATTEMPTS = 5;

/**
 * §5.4: "se a chamada falhar, o log de eventos permanece como verdade e um
 * job reconcilia." Re-dispatches every FAILED stage webhook row with
 * attempts < 5; gives up beyond that (surfaced on an admin health screen —
 * not built in this plan, flagged as a Fase 6 monitoring follow-up).
 */
@Injectable()
export class BotReconciliationCronProvider {
  private readonly logger = new Logger(BotReconciliationCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botStageWebhookProvider: BotStageWebhookProvider,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcile(): Promise<void> {
    const failedDispatches = await this.prisma.botStageWebhookDispatch.findMany({
      where: { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
    });

    if (failedDispatches.length === 0) return;

    this.logger.log(`Reconciling ${failedDispatches.length} failed stage webhook dispatch(es)`);

    for (const dispatch of failedDispatches) {
      await this.botStageWebhookProvider.retry(dispatch.id, dispatch.tenant_id, dispatch.funnel_event_id);
    }
  }
}
