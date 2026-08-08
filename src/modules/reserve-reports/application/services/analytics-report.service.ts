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

  async create(tenantId: string, dto: CreateAnalyticsReportDto): Promise<AnalyticsReport> {
    await this.assertPhoneIsFree(dto.phone);

    return this.repository.create(
      tenantId,
      new AnalyticsReport({
        tenantId,
        phone: dto.phone,
        url: dto.url,
        label: dto.label,
      }),
    );
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAnalyticsReportDto,
  ): Promise<AnalyticsReport> {
    const report = await this.repository.findById(tenantId, id);
    if (!report) {
      throw new NotFoundException('Analytics report not found');
    }

    if (dto.phone && dto.phone !== report.phone) {
      await this.assertPhoneIsFree(dto.phone);
    }

    return this.repository.update(tenantId, id, {
      phone: dto.phone,
      url: dto.url,
      label: dto.label,
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const report = await this.repository.findById(tenantId, id);
    if (!report) {
      throw new NotFoundException('Analytics report not found');
    }
    await this.repository.delete(tenantId, id);
  }

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AnalyticsReport[]; total: number; page: number; limit: number }> {
    const result = await this.repository.findAll({ tenantId, page, limit });
    return { ...result, page, limit };
  }

  /**
   * Rota publica: nao ha tenant na request e o telefone e unico no sistema
   * inteiro, entao a resolucao e global por contrato. Responde tambem pelos
   * registros legados sem tenant_id.
   */
  async lookupByPhone(phone: string): Promise<{ url: string; label?: string }> {
    const report = await this.repository.findByPhoneGlobal(phone);
    if (!report) {
      throw new NotFoundException('No analytics report found for this phone number');
    }
    return { url: report.url, label: report.label };
  }

  /**
   * A unicidade do telefone e global (ver AnalyticsReport no schema), entao a
   * checagem tambem precisa ser — sem ela o insert estouraria como erro 500 de
   * constraint. A mensagem e deliberadamente neutra: nao diz de quem e o
   * vinculo existente nem se pertence a outro tenant.
   */
  private async assertPhoneIsFree(phone: string): Promise<void> {
    const existing = await this.repository.findByPhoneGlobal(phone);
    if (existing) {
      throw new ConflictException(`Phone ${phone} already has an analytics report assigned`);
    }
  }
}
