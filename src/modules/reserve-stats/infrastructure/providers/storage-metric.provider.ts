import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IMetricProvider,
  MetricGroup,
  DateRange,
  TimeSeriesGranularity,
  TimeSeriesGroup,
} from '../../domain/interfaces/metric-provider.interface';

/**
 * Internal metric provider for the Storage (Media) bounded context.
 * Exposes collection counts, asset counts and storage size per tenant.
 */
@Injectable()
export class StorageMetricProvider implements IMetricProvider {
  readonly moduleKey = 'storage';
  readonly label = 'Storage';

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId?: string, dateRange?: DateRange): Promise<MetricGroup> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime());

    const tenantFilter = tenantId !== undefined ? { tenant_id: tenantId } : {};

    const [
      totalCollections,
      totalAssets,
      periodAssets,
      prevAssets,
      totalSizeAgg,
      periodSizeAgg,
      byType,
    ] = await Promise.all([
      this.prisma.mediaCollection.count({ where: tenantFilter }),
      this.prisma.mediaAsset.count({ where: tenantFilter }),
      this.prisma.mediaAsset.count({
        where: { ...tenantFilter, created_at: { gte: from, lte: to } },
      }),
      this.prisma.mediaAsset.count({
        where: { ...tenantFilter, created_at: { gte: prevFrom, lte: prevTo } },
      }),
      this.prisma.mediaAsset.aggregate({
        where: tenantFilter,
        _sum: { file_size: true },
      }),
      this.prisma.mediaAsset.aggregate({
        where: { ...tenantFilter, created_at: { gte: from, lte: to } },
        _sum: { file_size: true },
      }),
      // Group by top-level mime type category (image, video, application, etc.)
      this.prisma.mediaAsset.groupBy({
        by: ['mime_type'],
        where: tenantFilter,
        _count: { _all: true },
      }),
    ]);

    const assetTrend =
      prevAssets > 0 ? ((periodAssets - prevAssets) / prevAssets) * 100 : null;

    const totalBytes = totalSizeAgg._sum.file_size ?? 0;
    const periodBytes = periodSizeAgg._sum.file_size ?? 0;

    // Aggregate by top-level mime category (e.g. "image/jpeg" → "image")
    const byCategory: Record<string, number> = {};
    for (const row of byType) {
      const category = row.mime_type.split('/')[0] ?? 'other';
      byCategory[category] = (byCategory[category] ?? 0) + row._count._all;
    }

    return {
      moduleKey: this.moduleKey,
      label: this.label,
      description: 'Media asset and collection storage metrics',
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'storage.collections',
          label: 'Collections',
          value: totalCollections,
          unit: 'count',
        },
        {
          key: 'storage.assets.total',
          label: 'Total Assets',
          value: totalAssets,
          unit: 'count',
        },
        {
          key: 'storage.assets.period',
          label: 'Assets uploaded this period',
          value: periodAssets,
          unit: 'count',
          ...(assetTrend !== null ? { trend: Math.round(assetTrend * 10) / 10 } : {}),
        },
        {
          key: 'storage.size.total',
          label: 'Total Storage Used',
          value: totalBytes,
          unit: 'bytes',
          metadata: { human: formatBytes(totalBytes) },
        },
        {
          key: 'storage.size.period',
          label: 'Storage added this period',
          value: periodBytes,
          unit: 'bytes',
          metadata: { human: formatBytes(periodBytes) },
        },
        ...Object.entries(byCategory).map(([category, count]) => ({
          key: `storage.assets.type.${category}`,
          label: `Assets - ${capitalize(category)}`,
          value: count,
          unit: 'count',
        })),
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
       FROM "media_assets"
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
        metricKey: 'storage.uploads',
        metricLabel: 'Uploads',
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
