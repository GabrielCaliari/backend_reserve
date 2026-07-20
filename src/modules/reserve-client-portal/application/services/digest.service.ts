import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { RoiAnalysisService } from './roi-analysis.service';
import { ActivityLogService } from './activity-log.service';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';
import { EActivityLogCategory } from '../../domain/enums/activity-log-category.enum';
import { NotificationEventService } from '../../../reserve-notifications/application/services/notification-event.service';
import { NotificationSettingsService } from '../../../reserve-notifications/application/services/notification-settings.service';
import { NOTIFICATION_EVENTS } from '../../../reserve-notifications/domain/constants/notification-events';
import { PublishDigestDto } from '../dtos/digest.dto';
import { WhatsAppCloudApiProvider } from '../../infrastructure/providers/whatsapp-cloud-api.provider';

/**
 * Resumo quinzenal (§3.7.1). `DigestReport` is deliberately decoupled from
 * `MonthlyReport` — see the plan's Fase 5 Task 2 for the reasoning
 * (`MonthlyReport`'s `@@unique([client_id, reference_month])` is incompatible
 * with a twice-a-month cadence).
 */
@Injectable()
export class DigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roiAnalysisService: RoiAnalysisService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationEventService: NotificationEventService,
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly whatsAppCloudApiProvider: WhatsAppCloudApiProvider,
  ) {}

  /**
   * Generates (or returns the already-generated) draft digest for a tenant's
   * period. Idempotent by design: a same-day cron re-run for a period that
   * already has a DigestReport row is a no-op, never a duplicate.
   * "Automação monta, humano assina" — never sets status: PUBLISHED here.
   */
  async generateDraft(tenantId: string, clientId: string, periodStart: Date, periodEnd: Date) {
    const existing = await this.prisma.digestReport.findUnique({
      where: { tenant_id_period_start: { tenant_id: tenantId, period_start: periodStart } },
    });
    if (existing) return existing;

    const roiResult = await this.roiAnalysisService.getRoi(clientId, periodStart, periodEnd);
    const metricsPayload = roiResult.data as object;

    const report = await this.prisma.digestReport.create({
      data: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        metrics_payload: metricsPayload,
        status: 'DRAFT',
      },
    });

    await this.prisma.digestRun.create({
      data: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        metrics_payload: metricsPayload,
        report_id: report.id,
        status: 'gerado',
      },
    });

    return report;
  }

  async findByTenantId(tenantId: string, page = 1, limit = 12) {
    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.digestReport.findMany({
          where: { tenant_id: tenantId },
          orderBy: { period_start: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.digestReport.count({ where: { tenant_id: tenantId } }),
      ]);
      return successResponse({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return errorResponse('500:DIGESTS_NOT_LISTED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const digest = await this.prisma.digestReport.findUnique({ where: { id } });
      if (!digest) return errorResponse('404:DIGEST_NOT_FOUND', 404);
      return successResponse(digest);
    } catch (error) {
      return errorResponse('500:DIGEST_NOT_FOUND', 500, error);
    }
  }

  /** Mirrors ReportService.submitForReview's exact pattern (same two-step state machine). */
  async submitForReview(id: string) {
    try {
      const digest = await this.prisma.digestReport.findUnique({ where: { id } });
      if (!digest) return errorResponse('404:DIGEST_NOT_FOUND', 404);
      if (digest.status !== 'DRAFT') {
        return errorResponse('409:DIGEST_NOT_IN_DRAFT_STATUS', 409);
      }
      // No separate REVIEW status on DigestReport (unlike MonthlyReport's
      // DRAFT/REVIEW/PUBLISHED) — the digest table only models DRAFT/PUBLISHED
      // (see schema.prisma's EDigestStatus). Submitting for review is a no-op
      // state transition today, kept as its own endpoint so the frontend's
      // "enviar para revisão" action has somewhere to call; publish is still
      // the actual gate.
      return successResponse(digest);
    } catch (error) {
      return errorResponse('500:DIGEST_NOT_UPDATED', 500, error);
    }
  }

  async publish(id: string, dto: PublishDigestDto) {
    try {
      const digest = await this.prisma.digestReport.findUnique({ where: { id } });
      if (!digest) return errorResponse('404:DIGEST_NOT_FOUND', 404);
      if (digest.status === 'PUBLISHED') {
        return errorResponse('409:DIGEST_ALREADY_PUBLISHED', 409);
      }

      const publishedAt = new Date();
      const [updated] = await this.prisma.$transaction([
        this.prisma.digestReport.update({
          where: { id },
          data: {
            ...dto,
            status: 'PUBLISHED',
            published_at: publishedAt,
            notification_sent: true,
          },
        }),
        this.prisma.digestRun.updateMany({
          where: { report_id: id },
          data: { status: 'publicado', published_at: publishedAt },
        }),
      ]);

      await this.activityLogService.record(digest.tenant_id, {
        type: EActivityLogType.AUTO,
        category: EActivityLogCategory.REPORT,
        title: 'Resumo quinzenal publicado',
      });

      const metrics = this.extractHeadlineMetrics(digest.metrics_payload);
      await this.notificationEventService.dispatch(
        NOTIFICATION_EVENTS.DIGEST_PUBLISHED,
        digest.tenant_id,
        {
          period_start: digest.period_start,
          period_end: digest.period_end,
          ...metrics,
        },
      );

      // Fase 6 Task 3: WhatsApp send alongside the existing email dispatch,
      // gated on the tenant's own opt-in (default off — see
      // TenantNotificationSettings.whatsapp_enabled). Fire-and-forget: a
      // failed WhatsApp send must never fail the publish action itself
      // (the email notification above is the notification of record).
      await this.sendWhatsAppDigestNotification(digest.tenant_id, metrics);

      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:DIGEST_NOT_PUBLISHED', 500, error);
    }
  }

  /** Pulls the headline numbers RoiAnalysisService produced out of metrics_payload for the email body. */
  private extractHeadlineMetrics(metricsPayload: unknown): {
    spend?: number;
    conversas?: number;
    costPerConversation?: number;
  } {
    const payload = metricsPayload as {
      nivel1?: {
        spend?: { value?: number };
        conversas?: { value?: number };
        costPerConversation?: { value?: number };
      };
    };
    return {
      spend: payload?.nivel1?.spend?.value,
      conversas: payload?.nivel1?.conversas?.value,
      costPerConversation: payload?.nivel1?.costPerConversation?.value,
    };
  }

  /**
   * Fire-and-forget WhatsApp digest send. Never throws — a failed/absent
   * WhatsApp configuration must not fail `publish()`, matching Fase 3 Task
   * 7's reverse-webhook precedent (the email dispatch above is already the
   * notification of record; this is a secondary, opt-in channel).
   */
  private async sendWhatsAppDigestNotification(
    tenantId: string,
    metrics: { spend?: number; conversas?: number; costPerConversation?: number },
  ): Promise<void> {
    try {
      const { enabled, phone } =
        await this.notificationSettingsService.getWhatsAppNotificationSettings(tenantId);
      if (!enabled || !phone) return;

      const money = (cents?: number) =>
        cents != null ? (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';

      await this.whatsAppCloudApiProvider.sendDigestNotification(phone, [
        money(metrics.spend),
        String(metrics.conversas ?? '-'),
        money(metrics.costPerConversation),
      ]);
    } catch {
      // sendDigestNotification/sendTemplate already return a result object
      // rather than throwing, but this catch is documented defense-in-depth
      // for the same reason whatsapp-tracking.service.ts's own fire-and-
      // forget call sites keep one.
    }
  }
}
