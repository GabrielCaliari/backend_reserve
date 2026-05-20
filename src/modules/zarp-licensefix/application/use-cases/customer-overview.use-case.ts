import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface ICustomerOverviewFilters {
  tenantId?: string;
  search?: string;
  accessStatus?: string;
  examStatus?: string;
  section?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class CustomerOverviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ICustomerOverviewFilters) {
    const customers = await this.prisma.customer.findMany({
      where: {
        ...(filters.tenantId && { tenant_id: filters.tenantId }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters.accessStatus && {
          ProductAccess: { some: { status: filters.accessStatus } },
        }),
      },
      include: {
        Tenant: { select: { id: true, name: true, slug: true } },
        ProductAccess: {
          orderBy: { access_granted_at: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            access_type: true,
            access_granted_at: true,
            access_expires_at: true,
            product_id: true,
          },
        },
        ExamAttempts: {
          where: {
            ...(filters.examStatus && { status: filters.examStatus as any }),
            ...(filters.section && { PracticeExam: { section: filters.section as any } }),
            ...(filters.dateFrom || filters.dateTo
              ? {
                  started_at: {
                    ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
                    ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
                  },
                }
              : {}),
          },
          orderBy: { started_at: 'desc' },
          include: {
            PracticeExam: { select: { id: true, title: true, section: true } },
          },
        },
        _count: { select: { ExamAttempts: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return customers.map((c) => {
      const latestAccess = c.ProductAccess[0] ?? null;
      const completedAttempts = c.ExamAttempts.filter((a) => a.status === 'COMPLETED');
      const bestScore = completedAttempts.length
        ? Math.max(...completedAttempts.map((a) => a.score ?? 0))
        : null;
      const lastAttempt = c.ExamAttempts[0] ?? null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone_number: c.phone_number,
        tenant: c.Tenant,
        created_at: c.created_at,
        access: latestAccess,
        exam_summary: {
          total_attempts: c._count.ExamAttempts,
          completed_attempts: completedAttempts.length,
          best_score: bestScore,
          last_attempt_at: lastAttempt?.started_at ?? null,
          last_attempt_status: lastAttempt?.status ?? null,
          last_exam_title: lastAttempt?.PracticeExam?.title ?? null,
        },
        attempts: c.ExamAttempts,
      };
    });
  }

  async exportCSV(filters: ICustomerOverviewFilters): Promise<string> {
    const customers = await this.list(filters);
    const rows: string[] = [
      'name,email,phone,tenant,access_status,access_type,access_granted_at,total_attempts,completed_attempts,best_score,last_attempt_at',
    ];

    for (const c of customers) {
      rows.push([
        `"${c.name}"`,
        `"${c.email}"`,
        `"${c.phone_number ?? ''}"`,
        `"${c.tenant.name}"`,
        c.access?.status ?? '',
        c.access?.access_type ?? '',
        c.access?.access_granted_at?.toISOString() ?? '',
        c.exam_summary.total_attempts,
        c.exam_summary.completed_attempts,
        c.exam_summary.best_score ?? '',
        c.exam_summary.last_attempt_at?.toISOString() ?? '',
      ].join(','));
    }

    return rows.join('\n');
  }
}
