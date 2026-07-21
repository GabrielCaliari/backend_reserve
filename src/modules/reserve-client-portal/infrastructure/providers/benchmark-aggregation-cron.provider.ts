import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  BENCHMARK_MIN_CONTRACT_MONTHS,
} from '../../application/services/benchmark-eligibility.service';

const WINDOW_DAYS = 30;
const COHORT_METRIC = 'conversas_30d_media_por_tenant';

interface IDistributionStats {
  sample_size: number;
  mean: number;
  median: number;
  min: number;
  max: number;
}

/**
 * Weekly agency benchmark aggregation (Fase 6 Task 5).
 *
 * Buildable now that Fase 2/3 (ConversationAttribution) have merged into
 * `main` — earlier drafts of Fase 6 Task 5 skipped this entirely because
 * the source data didn't exist yet; re-checked mid-implementation once
 * Fase 3 landed.
 *
 * Computes and stores `BenchmarkAggregate` rows on every run regardless of
 * `BenchmarkEligibilityService.isPubliclyUsable()` ("coleta comeca ja",
 * Sec7) — eligibility only gates the read endpoint. The cohort itself is
 * the same population the eligibility gate counts (active `HotelClient`
 * with a linked tenant, contract started at least 6 months ago), so
 * `tenant_count`/`min_contract_months` on the stored row are always
 * consistent with what the eligibility check would report at the same
 * moment.
 *
 * `value_json` holds only aggregate distribution stats (mean/median/min/
 * max/sample_size) across tenants — never a per-tenant breakdown, per
 * Decisao 16's "aggregated stats only, never per-tenant identifiable data."
 */
@Injectable()
export class BenchmarkAggregationCronProvider {
  private readonly logger = new Logger(BenchmarkAggregationCronProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async run(): Promise<void> {
    const tenantIds = await this.eligibleTenantIds();

    if (tenantIds.length === 0) {
      this.logger.log('Benchmark aggregation: no eligible tenants yet, skipping.');
      return;
    }

    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const counts = await Promise.all(
      tenantIds.map((tenantId) =>
        this.prisma.conversationAttribution.count({
          where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to } },
        }),
      ),
    );

    const stats = this.distribution(counts);

    await this.prisma.benchmarkAggregate.create({
      data: {
        cohort_metric: COHORT_METRIC,
        tenant_count: tenantIds.length,
        min_contract_months: BENCHMARK_MIN_CONTRACT_MONTHS,
        period_label: `${this.isoDate(from)}_${this.isoDate(to)}`,
        value_json: stats as unknown as object,
      },
    });

    this.logger.log(
      `Benchmark aggregation computed: ${COHORT_METRIC} across ${tenantIds.length} tenants.`,
    );
  }

  private async eligibleTenantIds(): Promise<string[]> {
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - BENCHMARK_MIN_CONTRACT_MONTHS);

    const clients = await this.prisma.hotelClient.findMany({
      where: {
        is_active: true,
        tenant_id: { not: null },
        contract_start: { lte: threshold },
      },
      select: { tenant_id: true },
    });

    return clients.map((c) => c.tenant_id).filter((id): id is string => Boolean(id));
  }

  private distribution(values: number[]): IDistributionStats {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return {
      sample_size: sorted.length,
      mean: sorted.length ? Math.round((sum / sorted.length) * 100) / 100 : 0,
      median,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
    };
  }

  private isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
