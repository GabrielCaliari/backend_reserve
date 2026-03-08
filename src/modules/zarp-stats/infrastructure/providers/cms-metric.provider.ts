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
 * Internal metric provider for the CMS bounded context.
 * Registered as a multi-provider in ZarpStatsModule.
 */
@Injectable()
export class CmsMetricProvider implements IMetricProvider {
  readonly moduleKey = 'cms';
  readonly label = 'CMS';
  readonly scope = 'both' as const;

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

    const [
      totalBlogs,
      activeBlogs,
      totalAuthors,
      totalArticles,
      periodArticles,
      publishedArticles,
      byStatus,
      byBlogRaw,
    ] = await Promise.all([
      this.prisma.blog.count({ where: blogWhere }),
      this.prisma.blog.count({ where: { ...blogWhere, active: true } }),
      this.prisma.author.count({
        where: tenantId !== undefined ? { tenant_id: tenantId } : {},
      }),
      this.prisma.article.count({ where: totalWhere }),
      this.prisma.article.count({ where: periodWhere }),
      this.prisma.article.count({ where: { ...totalWhere, status: 'published' } }),
      this.prisma.article.groupBy({
        by: ['status'],
        where: totalWhere,
        _count: { _all: true },
      }),
      this.prisma.article.groupBy({
        by: ['blog_id'],
        where: totalWhere,
        _count: { _all: true },
      }),
    ]);

    const publishRate = totalArticles > 0 ? (publishedArticles / totalArticles) * 100 : 0;
    const averageArticlesPerBlog = totalBlogs > 0 ? totalArticles / totalBlogs : 0;

    const topBlogRows = byBlogRaw
      .sort((left, right) => right._count._all - left._count._all)
      .slice(0, 5);

    const topBlogIds = topBlogRows.map(row => row.blog_id);
    const topBlogs = topBlogIds.length > 0
      ? await this.prisma.blog.findMany({
          where: { id: { in: topBlogIds } },
          select: { id: true, name: true, tenant_id: true },
        })
      : [];
    const blogNameById = Object.fromEntries(topBlogs.map(blog => [blog.id, blog.name]));

    return {
      moduleKey: this.moduleKey,
      label: this.label,
      description: 'Blog and article content metrics',
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'cms.blogs',
          label: 'Blogs',
          value: totalBlogs,
          unit: 'count',
        },
        {
          key: 'cms.blogs.active',
          label: 'Active Blogs',
          value: activeBlogs,
          unit: 'count',
        },
        {
          key: 'cms.authors.total',
          label: 'Authors',
          value: totalAuthors,
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
        {
          key: 'cms.articles.publish_rate',
          label: 'Publish Rate',
          value: Math.round(publishRate * 10) / 10,
          unit: '%',
        },
        {
          key: 'cms.articles.average_per_blog',
          label: 'Average Articles per Blog',
          value: Math.round(averageArticlesPerBlog * 10) / 10,
          unit: 'count',
        },
        ...byStatus.map((s) => ({
          key: `cms.articles.status.${s.status}`,
          label: `Articles - ${s.status}`,
          value: s._count._all,
          unit: 'count',
        })),
        ...topBlogRows.map((row) => ({
          key: `cms.blog.${row.blog_id}.articles`,
          label: `Top Blog: ${blogNameById[row.blog_id] ?? row.blog_id}`,
          value: row._count._all,
          unit: 'count',
          metadata: {
            blog_id: row.blog_id,
            blog_name: blogNameById[row.blog_id] ?? row.blog_id,
          },
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

    const blogWhere = tenantId !== undefined ? { tenant_id: tenantId } : {};
    const blogs = await this.prisma.blog.findMany({
      where: blogWhere,
      select: { id: true },
    });
    const blogIds = blogs.map((b) => b.id);

    if (blogIds.length === 0) {
      return [
        {
          moduleKey: this.moduleKey,
          label: this.label,
          metricKey: 'cms.articles.created',
          metricLabel: 'Articles created',
          granularity,
          from,
          to,
          series: [],
        },
      ];
    }

    const placeholders = blogIds.map((_, i) => `$${i + 4}`).join(', ');
    const rows = await this.prisma.$queryRawUnsafe<{ bucket: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC($1, "created_at") AS bucket, COUNT(*)::bigint AS count
       FROM "Article"
       WHERE "blog_id" IN (${placeholders})
         AND "created_at" >= $2
         AND "created_at" <= $3
       GROUP BY bucket
       ORDER BY bucket`,
      trunc,
      from,
      to,
      ...blogIds,
    );

    return [
      {
        moduleKey: this.moduleKey,
        label: this.label,
        metricKey: 'cms.articles.created',
        metricLabel: 'Articles created',
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
