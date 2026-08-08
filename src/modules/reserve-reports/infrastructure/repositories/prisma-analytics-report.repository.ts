import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AnalyticsReport } from '../../domain/entities/analytics-report.entity';
import { IAnalyticsReportRepository } from '../../domain/interfaces';

@Injectable()
export class PrismaAnalyticsReportRepository implements IAnalyticsReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): AnalyticsReport {
    return new AnalyticsReport({
      id: raw.id,
      tenantId: raw.tenant_id ?? undefined,
      phone: raw.phone,
      url: raw.url,
      label: raw.label ?? undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  async create(tenantId: string, data: AnalyticsReport): Promise<AnalyticsReport> {
    const raw = await this.prisma.analyticsReport.create({
      data: {
        tenant_id: tenantId,
        phone: data.phone,
        url: data.url,
        label: data.label,
      },
    });
    return this.toDomain(raw);
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<AnalyticsReport>,
  ): Promise<AnalyticsReport> {
    // tenant_id entra no `where`, nao so no filtro que o service ja fez antes:
    // se o id for de outro tenant a escrita nao acontece (P2025) em vez de
    // sobrescrever dado alheio.
    const raw = await this.prisma.analyticsReport.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.label !== undefined && { label: data.label }),
      },
    });
    return this.toDomain(raw);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.analyticsReport.delete({ where: { id, tenant_id: tenantId } });
  }

  async findById(tenantId: string, id: string): Promise<AnalyticsReport | null> {
    const raw = await this.prisma.analyticsReport.findFirst({
      where: { id, tenant_id: tenantId },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByPhoneGlobal(phone: string): Promise<AnalyticsReport | null> {
    const raw = await this.prisma.analyticsReport.findUnique({ where: { phone } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAll({
    tenantId,
    page,
    limit,
  }: {
    tenantId: string;
    page: number;
    limit: number;
  }): Promise<{ data: AnalyticsReport[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = { tenant_id: tenantId };
    const [records, total] = await Promise.all([
      this.prisma.analyticsReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.analyticsReport.count({ where }),
    ]);
    return { data: records.map((r) => this.toDomain(r)), total };
  }
}
