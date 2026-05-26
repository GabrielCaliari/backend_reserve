import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsReport } from '../../domain/entities/analytics-report.entity';
import {
  ANALYTICS_REPORT_REPOSITORY,
  IAnalyticsReportRepository,
} from '../../domain/interfaces';
import { CreateAnalyticsReportDto } from '../dtos/create-analytics-report.dto';
import { UpdateAnalyticsReportDto } from '../dtos/update-analytics-report.dto';

@Injectable()
export class AnalyticsReportService {
  constructor(
    @Inject(ANALYTICS_REPORT_REPOSITORY)
    private readonly repository: IAnalyticsReportRepository,
  ) {}

  async create(dto: CreateAnalyticsReportDto): Promise<AnalyticsReport> {
    const existing = await this.repository.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException(`Phone ${dto.phone} already has an analytics report assigned`);
    }

    return this.repository.create(
      new AnalyticsReport({ phone: dto.phone, url: dto.url, label: dto.label }),
    );
  }

  async update(id: string, dto: UpdateAnalyticsReportDto): Promise<AnalyticsReport> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new NotFoundException('Analytics report not found');
    }

    if (dto.phone && dto.phone !== report.phone) {
      const existing = await this.repository.findByPhone(dto.phone);
      if (existing) {
        throw new ConflictException(`Phone ${dto.phone} already has an analytics report assigned`);
      }
    }

    return this.repository.update(id, {
      phone: dto.phone,
      url: dto.url,
      label: dto.label,
    });
  }

  async delete(id: string): Promise<void> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new NotFoundException('Analytics report not found');
    }
    await this.repository.delete(id);
  }

  async findAll(page: number, limit: number): Promise<{ data: AnalyticsReport[]; total: number; page: number; limit: number }> {
    const result = await this.repository.findAll({ page, limit });
    return { ...result, page, limit };
  }

  async lookupByPhone(phone: string): Promise<{ url: string; label?: string }> {
    const report = await this.repository.findByPhone(phone);
    if (!report) {
      throw new NotFoundException('No analytics report found for this phone number');
    }
    return { url: report.url, label: report.label };
  }
}
