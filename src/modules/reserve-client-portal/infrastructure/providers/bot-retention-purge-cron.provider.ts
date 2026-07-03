import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotRetentionService } from '../../application/services/bot-retention.service';

/**
 * §5.8: daily purge of conversation content (BotMessage) and ingestion
 * ledger payloads older than each tenant's retention_days (default 365).
 * Never touches FunnelEvent — the audit trail is explicitly out of scope for
 * this purge (§5.8 only asks for conversation content, not funnel history).
 */
@Injectable()
export class BotRetentionPurgeCronProvider {
  private readonly logger = new Logger(BotRetentionPurgeCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retentionService: BotRetentionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge(): Promise<void> {
    const tenantsWithBot = await this.prisma.botIntegrationConfig.findMany({
      select: { tenant_id: true },
    });

    for (const { tenant_id: tenantId } of tenantsWithBot) {
      const retentionDays = await this.retentionService.getRetentionDays(tenantId);
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const [deletedMessages, purgedLedgerRows] = await Promise.all([
        this.prisma.botMessage.deleteMany({
          where: { tenant_id: tenantId, ocorrido_em: { lt: cutoff } },
        }),
        this.prisma.botIngestionEvent.updateMany({
          where: { tenant_id: tenantId, received_at: { lt: cutoff }, payload: { not: {} } },
          data: { payload: {} },
        }),
      ]);

      if (deletedMessages.count > 0 || purgedLedgerRows.count > 0) {
        this.logger.log(
          `Purged tenant ${tenantId}: ${deletedMessages.count} messages, ${purgedLedgerRows.count} ledger payloads (retention_days=${retentionDays})`,
        );
      }
    }
  }
}
