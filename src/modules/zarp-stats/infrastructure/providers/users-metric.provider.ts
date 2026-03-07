import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import {
  IMetricProvider,
  MetricGroup,
  DateRange,
} from '../../domain/interfaces/metric-provider.interface';

/**
 * Internal metric provider for platform Users.
 * Provides global user registration and plan metrics.
 * Not tenant-scoped since users are global (one user can have multiple tenants).
 */
@Injectable()
export class UsersMetricProvider implements IMetricProvider {
  readonly moduleKey = 'users';
  readonly label = 'Users';

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(_tenantId?: string, dateRange?: DateRange): Promise<MetricGroup> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime());

    const [totalUsers, periodUsers, prevUsers, activeSubscriptions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { created_at: { gte: from, lte: to } } }),
      this.prisma.user.count({ where: { created_at: { gte: prevFrom, lte: prevTo } } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);

    const trend = prevUsers > 0 ? ((periodUsers - prevUsers) / prevUsers) * 100 : null;

    return {
      moduleKey: this.moduleKey,
      label: this.label,
      description: 'Platform user registration and subscription metrics',
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'users.total',
          label: 'Total Users',
          value: totalUsers,
          unit: 'count',
        },
        {
          key: 'users.period',
          label: 'New users this period',
          value: periodUsers,
          unit: 'count',
          ...(trend !== null ? { trend: Math.round(trend * 10) / 10 } : {}),
        },
        {
          key: 'users.subscriptions.active',
          label: 'Active Subscriptions',
          value: activeSubscriptions,
          unit: 'count',
        },
      ],
    };
  }
}
