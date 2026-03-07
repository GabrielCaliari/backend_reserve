import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import {
  IMetricProvider,
  MetricGroup,
  DateRange,
} from '../../domain/interfaces/metric-provider.interface';

/**
 * Internal metric provider for the Lead bounded context.
 * Registered as a multi-provider in ZarpStatsModule.
 */
@Injectable()
export class LeadsMetricProvider implements IMetricProvider {
  readonly moduleKey = 'leads';
  readonly label = 'Lead Management';

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId?: number, dateRange?: DateRange): Promise<MetricGroup> {
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

    const [total, periodCount, prevCount, byStatus] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: wherePeriod }),
      this.prisma.lead.count({ where: { ...where, created_at: { gte: prevFrom, lte: prevTo } } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: wherePeriod,
        _count: { _all: true },
      }),
    ]);

    const trend = prevCount > 0 ? ((periodCount - prevCount) / prevCount) * 100 : null;

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
          label: `Status ${s.status ?? 'N/A'}`,
          value: s._count._all,
          unit: 'count',
        })),
      ],
    };
  }
}
