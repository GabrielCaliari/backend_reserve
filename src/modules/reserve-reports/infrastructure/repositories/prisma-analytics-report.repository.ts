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
      phone: raw.phone,
      url: raw.url,
      label: raw.label ?? undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  async create(data: AnalyticsReport): Promise<AnalyticsReport> {
    const raw = await this.prisma.analyticsReport.create({
      data: {
        phone: data.phone,
        url: data.url,
        label: data.label,
      },
    });
    return this.toDomain(raw);
  }

  async update(id: string, data: Partial<AnalyticsReport>): Promise<AnalyticsReport> {
    const raw = await this.prisma.analyticsReport.update({
      where: { id },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.label !== undefined && { label: data.label }),
      },
    });
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.analyticsReport.delete({ where: { id } });
  }

  async findById(id: string): Promise<AnalyticsReport | null> {
    const raw = await this.prisma.analyticsReport.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByPhone(phone: string): Promise<AnalyticsReport | null> {
    const raw = await this.prisma.analyticsReport.findUnique({ where: { phone } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAll({ page, limit }: { page: number; limit: number }): Promise<{ data: AnalyticsReport[]; total: number }> {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.prisma.analyticsReport.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.analyticsReport.count(),
    ]);
    return { data: records.map((r) => this.toDomain(r)), total };
  }
}
