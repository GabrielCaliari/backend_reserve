import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';

const TOKEN_EXPIRY_WARNING_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h, per the plan
// Same threshold BotChannelHealthService (Fase 3 Task 8) uses for
// heartbeatStale — reused verbatim rather than re-derived.
const HEARTBEAT_STALE_MINUTES = 90;

export type IntegrationHealthFindingReason = 'SYNC_ERROR' | 'TOKEN_EXPIRING' | 'BOT_HEARTBEAT_STALE';

export interface IIntegrationHealthFinding {
  reason: IntegrationHealthFindingReason;
  tenant_id: string | null;
  client_id: string | null;
  hotel_name: string;
  platform: string;
  detail: string;
}

/**
 * Hourly integration health scan (Fase 6 Task 6).
 *
 * Covers:
 *  - `HotelApiCredential`: sync_status ERROR, or token_expires_at within 48h.
 *  - `BotIntegrationConfig`: active integrations whose `last_heartbeat_at`
 *    is null or older than 90 minutes (same threshold
 *    `BotChannelHealthService.HEARTBEAT_STALE_MINUTES` uses, Fase 3 Task 8).
 *    Buildable now that Fase 3 has merged into `main` — earlier drafts of
 *    this task shipped without this scan because `BotIntegrationConfig`
 *    didn't exist yet; re-checked mid-implementation once Fase 3 landed.
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
    const [credentialFindings, botFindings] = await Promise.all([
      this.scanCredentials(),
      this.scanBotHeartbeats(),
    ]);
    const findings = [...credentialFindings, ...botFindings];

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
        HotelClient: { select: { hotel_name: true, tenant_id: true } },
      },
    });

    const findings: IIntegrationHealthFinding[] = [];

    for (const cred of credentials) {
      if (cred.sync_status === EIntegrationStatus.ERROR) {
        findings.push({
          reason: 'SYNC_ERROR',
          tenant_id: cred.HotelClient.tenant_id,
          client_id: cred.client_id,
          hotel_name: cred.HotelClient.hotel_name,
          platform: cred.platform,
          detail: cred.error_message ?? 'Integration sync_status is ERROR.',
        });
      }
      if (cred.token_expires_at && cred.token_expires_at < expiryThreshold) {
        findings.push({
          reason: 'TOKEN_EXPIRING',
          tenant_id: cred.HotelClient.tenant_id,
          client_id: cred.client_id,
          hotel_name: cred.HotelClient.hotel_name,
          platform: cred.platform,
          detail: `Token expires at ${cred.token_expires_at.toISOString()}.`,
        });
      }
    }

    return findings;
  }

  private async scanBotHeartbeats(): Promise<IIntegrationHealthFinding[]> {
    const staleThreshold = new Date(Date.now() - HEARTBEAT_STALE_MINUTES * 60 * 1000);

    const configs = await this.prisma.botIntegrationConfig.findMany({
      where: {
        active: true,
        OR: [{ last_heartbeat_at: null }, { last_heartbeat_at: { lt: staleThreshold } }],
      },
      select: { tenant_id: true, last_heartbeat_at: true },
    });

    if (configs.length === 0) return [];

    const tenantIds = configs.map((c) => c.tenant_id);
    const hotelClients = await this.prisma.hotelClient.findMany({
      where: { tenant_id: { in: tenantIds }, is_active: true },
      select: { tenant_id: true, hotel_name: true },
    });
    const hotelNameByTenant = new Map(hotelClients.map((h) => [h.tenant_id, h.hotel_name]));

    const findings: IIntegrationHealthFinding[] = [];
    for (const config of configs) {
      // Only alert for tenants with an active hotel client — a bot config
      // for a deactivated/offboarded client isn't an ops emergency.
      const hotelName = hotelNameByTenant.get(config.tenant_id);
      if (!hotelName) continue;

      findings.push({
        reason: 'BOT_HEARTBEAT_STALE',
        tenant_id: config.tenant_id,
        client_id: null,
        hotel_name: hotelName,
        platform: 'WHATSAPP_BOT',
        detail: config.last_heartbeat_at
          ? `Last heartbeat at ${config.last_heartbeat_at.toISOString()}.`
          : 'No heartbeat received yet.',
      });
    }

    return findings;
  }

  private alert(finding: IIntegrationHealthFinding): void {
    this.logger.error(
      `[integration-health] ${finding.reason} — ${finding.hotel_name} (${finding.tenant_id ?? finding.client_id}) / ${finding.platform}: ${finding.detail}`,
    );
  }
}
