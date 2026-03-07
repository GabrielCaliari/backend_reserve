import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import {
  IMetricProvider,
  MetricGroup,
  DateRange,
} from '../../domain/interfaces/metric-provider.interface';

/**
 * Internal metric provider for the CMS bounded context.
 * Registered as a multi-provider in ZarpStatsModule.
 */
@Injectable()
export class CmsMetricProvider implements IMetricProvider {
  readonly moduleKey = 'cms';
  readonly label = 'CMS';

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(tenantId?: string, dateRange?: DateRange): Promise<MetricGroup> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    // Find blogs belonging to this tenant
    const blogWhere = tenantId !== undefined ? { tenant_id: tenantId } : {};
    const blogs = await this.prisma.blog.findMany({
      where: blogWhere,
      select: { id: true },
    });
    const blogIds = blogs.map((b) => b.id);

    const periodWhere =
      blogIds.length > 0
        ? { blog_id: { in: blogIds }, created_at: { gte: from, lte: to } }
        : { created_at: { gte: from, lte: to } };

    const totalWhere = blogIds.length > 0 ? { blog_id: { in: blogIds } } : {};

    const [totalArticles, periodArticles, publishedArticles, byStatus] = await Promise.all([
      this.prisma.article.count({ where: totalWhere }),
      this.prisma.article.count({ where: periodWhere }),
      this.prisma.article.count({ where: { ...totalWhere, status: 'published' } }),
      this.prisma.article.groupBy({
        by: ['status'],
        where: totalWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      moduleKey: this.moduleKey,
      label: this.label,
      description: 'Blog and article content metrics',
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'cms.blogs',
          label: 'Blogs',
          value: blogIds.length,
          unit: 'count',
        },
        {
          key: 'cms.articles.total',
          label: 'Total Articles',
          value: totalArticles,
          unit: 'count',
        },
        {
          key: 'cms.articles.published',
          label: 'Published Articles',
          value: publishedArticles,
          unit: 'count',
        },
        {
          key: 'cms.articles.period',
          label: 'Articles created this period',
          value: periodArticles,
          unit: 'count',
        },
        ...byStatus.map((s) => ({
          key: `cms.articles.status.${s.status}`,
          label: `Articles - ${s.status}`,
          value: s._count._all,
          unit: 'count',
        })),
      ],
    };
  }
}
