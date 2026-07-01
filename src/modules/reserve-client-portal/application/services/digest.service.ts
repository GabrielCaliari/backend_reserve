import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { RoiAnalysisService } from './roi-analysis.service';

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
}
