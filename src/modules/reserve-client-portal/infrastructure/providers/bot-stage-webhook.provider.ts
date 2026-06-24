import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../../shared/database/prisma.service';

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * §5.4 "sincronização de volta" — best-effort dispatch of a human-authored
 * funnel stage move back to N8N. Never throws: a human just moved a lead in
 * the painel and that action must succeed regardless of N8N's reachability.
 * If the call fails (timeout, non-2xx, missing webhook URL), the log
 * (FunnelEvent) remains the source of truth and BotReconciliationCronProvider
 * retries later.
 */
@Injectable()
export class BotStageWebhookProvider {
  private readonly logger = new Logger(BotStageWebhookProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(tenantId: string, funnelEventId: string): Promise<void> {
    const dispatchRow = await this.prisma.botStageWebhookDispatch.create({
      data: { tenant_id: tenantId, funnel_event_id: funnelEventId, status: 'PENDING' },
    });

    await this.attempt(dispatchRow.id, tenantId, funnelEventId);
  }

  /** Re-dispatch an existing (previously FAILED) row, used by the reconciliation cron. */
  async retry(dispatchId: string, tenantId: string, funnelEventId: string): Promise<void> {
    await this.attempt(dispatchId, tenantId, funnelEventId);
  }

  private async attempt(dispatchId: string, tenantId: string, funnelEventId: string): Promise<void> {
    try {
      const [config, funnelEvent] = await Promise.all([
        this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } }),
        this.prisma.funnelEvent.findUnique({ where: { id: funnelEventId } }),
      ]);

      if (!config?.n8n_stage_webhook_url || !funnelEvent) {
        throw new Error('Missing n8n_stage_webhook_url or funnel event');
      }

      await axios.post(
        config.n8n_stage_webhook_url,
        {
          numero_contato: funnelEvent.numero_contato,
          para_estagio: funnelEvent.para_estagio,
          ocorrido_em: funnelEvent.ocorrido_em,
        },
        { timeout: WEBHOOK_TIMEOUT_MS },
      );

      await this.prisma.botStageWebhookDispatch.update({
        where: { id: dispatchId },
        data: { status: 'SENT', last_attempt_at: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Stage webhook dispatch failed (tenant=${tenantId}, funnelEvent=${funnelEventId}): ${error}`);
      await this.prisma.botStageWebhookDispatch.update({
        where: { id: dispatchId },
        data: { status: 'FAILED', attempts: { increment: 1 }, last_attempt_at: new Date() },
      });
    }
  }
}
