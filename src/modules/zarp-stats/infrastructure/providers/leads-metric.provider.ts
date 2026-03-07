import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import {
  IMetricProvider,
  MetricGroup,
  DateRange,
  TimeSeriesGranularity,
  TimeSeriesGroup,
} from '../../domain/interfaces/metric-provider.interface';

/**
 * Internal metric provider for the Lead bounded context.
 * Registered as a multi-provider in ZarpStatsModule.
 */
@Injectable()
export class LeadsMetricProvider implements IMetricProvider {
  readonly moduleKey = 'leads';
  readonly label = 'Lead Management';

  private readonly statusLabels: Record<number, string> = {
    1: 'New',
    2: 'Contacted',
    3: 'Qualified',
    4: 'Converted',
    5: 'Lost',
    8: 'Archived',
  };

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId?: string, dateRange?: DateRange): Promise<MetricGroup> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    const where = {
      ...(tenantId !== undefined ? { tenant_id: tenantId } : {}),
    };

    const wherePeriod = {
      ...where,
      created_at: { gte: from, lte: to },
    };

    // Calculate previous period for trend
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime());

    const [total, periodCount, prevCount, byStatus, byCollectionRaw] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: wherePeriod }),
      this.prisma.lead.count({ where: { ...where, created_at: { gte: prevFrom, lte: prevTo } } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: wherePeriod,
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['collection_id'],
        where: wherePeriod,
        _count: { _all: true },
      }),
    ]);

    const trend = prevCount > 0 ? ((periodCount - prevCount) / prevCount) * 100 : null;

    // Fetch collection names for the breakdown
    const collectionIds = byCollectionRaw
      .map((r) => r.collection_id)
      .filter((id): id is string => id !== null);

    const collections =
      collectionIds.length > 0
        ? await this.prisma.leadCollection.findMany({
            where: { id: { in: collectionIds } },
            select: { id: true, name: true },
          })
        : [];

    const collectionNameById = Object.fromEntries(collections.map((c) => [c.id, c.name]));

    const byCollectionMetrics = byCollectionRaw.map((r) => {
      const colId = r.collection_id ?? 'unknown';
      const colName = collectionNameById[colId] ?? `Collection ${colId}`;
      return {
        key: `leads.collection.${colId}`,
        label: `Collection: ${colName}`,
        value: r._count._all,
        unit: 'count',
        metadata: { collection_id: colId, collection_name: colName },
      };
    });

    return {
      moduleKey: this.moduleKey,
      label: this.label,
      description: 'Lead capture and management metrics',
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'leads.total',
          label: 'Total Leads',
          value: total,
          unit: 'count',
        },
        {
          key: 'leads.period',
          label: 'Leads this period',
          value: periodCount,
          unit: 'count',
          ...(trend !== null ? { trend: Math.round(trend * 10) / 10 } : {}),
        },
        ...byStatus.map((s) => ({
          key: `leads.status.${s.status ?? 'unknown'}`,
          label: `Status: ${this.statusLabels[s.status as number] ?? `Unknown (${s.status})`}`,
          value: s._count._all,
          unit: 'count',
        })),
        ...byCollectionMetrics,
      ],
    };
  }

  async getTimeSeries(
    tenantId: string,
    dateRange: DateRange,
    granularity: TimeSeriesGranularity,
  ): Promise<TimeSeriesGroup[]> {
    const { from, to } = dateRange;
    const trunc = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day';

    const rows = await this.prisma.$queryRawUnsafe<{ bucket: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC($1, "created_at") AS bucket, COUNT(*)::bigint AS count
       FROM "Lead"
       WHERE ($2::text IS NULL OR "tenant_id" = $2)
         AND "created_at" >= $3
         AND "created_at" <= $4
       GROUP BY bucket
       ORDER BY bucket`,
      trunc,
      tenantId ?? null,
      from,
      to,
    );

    return [
      {
        moduleKey: this.moduleKey,
        label: this.label,
        metricKey: 'leads.created',
        metricLabel: 'Leads created',
        granularity,
        from,
        to,
        series: rows.map((r) => ({
          date: r.bucket.toISOString().slice(0, 10),
          value: Number(r.count),
        })),
      },
    ];
  }
}
