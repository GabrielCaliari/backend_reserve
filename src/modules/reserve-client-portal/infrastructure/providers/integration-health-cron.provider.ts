import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';

const TOKEN_EXPIRY_WARNING_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h, per the plan

export type IntegrationHealthFindingReason = 'SYNC_ERROR' | 'TOKEN_EXPIRING';

export interface IIntegrationHealthFinding {
  reason: IntegrationHealthFindingReason;
  client_id: string;
  hotel_name: string;
  platform: string;
  detail: string;
}

/**
 * Hourly integration health scan (Fase 6 Task 6).
 *
 * Covers `HotelApiCredential` (sync_status ERROR, or token_expires_at within
 * 48h) — fully buildable today against data already on `main`.
 *
 * Deliberately NOT covered here: `BotIntegrationConfig` heartbeat staleness
 * (Fase 3 Task 8's 90-minute threshold the plan asks this task to reuse).
 * `BotIntegrationConfig` doesn't exist on `main` yet (Fase 3 is still
 * mid-merge) — adding a Prisma call against a model that isn't generated
 * would break the build, not degrade gracefully. Once Fase 3 lands, the
 * mechanical follow-up is: add a `this.prisma.botIntegrationConfig.findMany`
 * scan mirroring `scanCredentials()` below and push its findings through the
 * same `alert()` call — see the shape already established here.
 *
 * Alert delivery: `NotificationService`'s only broadcast concept
 * (`ENotificationScope.broadcast`) fans out to *every active tenant*
 * (`findAllActiveTenantIds()`) — i.e. every hotel client, not the internal
 * Reserve team. There is no "super_admin/ops-only" notification channel in
 * the merged code today (confirmed by reading `notification.service.ts`
 * and `notification-event.service.ts` in full), so routing these findings
 * through it would leak internal integration-health information to
 * clients — worse than not alerting at all. This cron instead emits one
 * structured `logger.error` per finding (ops-log-monitorable today) and
 * flags, per the plan's own note, that a real internal-alert channel
 * (a new `ENotificationScope.internal` concept, a Slack webhook, or an
 * ops-only email) needs a product/eng decision before this can page anyone.
 */
@Injectable()
export class IntegrationHealthCronProvider {
  private readonly logger = new Logger(IntegrationHealthCronProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkHealth(): Promise<IIntegrationHealthFinding[]> {
    const findings = await this.scanCredentials();

    for (const finding of findings) {
      this.alert(finding);
    }

    if (findings.length === 0) {
      this.logger.log('Integration health check: no issues found.');
    }

    return findings;
  }

  private async scanCredentials(): Promise<IIntegrationHealthFinding[]> {
    const expiryThreshold = new Date(Date.now() + TOKEN_EXPIRY_WARNING_WINDOW_MS);

    const credentials = await this.prisma.hotelApiCredential.findMany({
      where: {
        HotelClient: { is_active: true },
        OR: [
          { sync_status: EIntegrationStatus.ERROR },
          { token_expires_at: { not: null, lt: expiryThreshold } },
        ],
      },
      select: {
        client_id: true,
        platform: true,
        sync_status: true,
        token_expires_at: true,
        error_message: true,
        HotelClient: { select: { hotel_name: true } },
      },
    });

    const findings: IIntegrationHealthFinding[] = [];

    for (const cred of credentials) {
      if (cred.sync_status === EIntegrationStatus.ERROR) {
        findings.push({
          reason: 'SYNC_ERROR',
          client_id: cred.client_id,
          hotel_name: cred.HotelClient.hotel_name,
          platform: cred.platform,
          detail: cred.error_message ?? 'Integration sync_status is ERROR.',
        });
      }
      if (cred.token_expires_at && cred.token_expires_at < expiryThreshold) {
        findings.push({
          reason: 'TOKEN_EXPIRING',
          client_id: cred.client_id,
          hotel_name: cred.HotelClient.hotel_name,
          platform: cred.platform,
          detail: `Token expires at ${cred.token_expires_at.toISOString()}.`,
        });
      }
    }

    return findings;
  }

  private alert(finding: IIntegrationHealthFinding): void {
    this.logger.error(
      `[integration-health] ${finding.reason} — ${finding.hotel_name} (${finding.client_id}) / ${finding.platform}: ${finding.detail}`,
    );
  }
}
