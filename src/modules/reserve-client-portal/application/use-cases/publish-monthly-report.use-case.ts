import { Injectable } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { PublishReportDto } from '../dtos/publish-report.dto';

@Injectable()
export class PublishMonthlyReportUseCase {
  constructor(private readonly reportService: ReportService) {}

  async execute(reportId: string, dto: PublishReportDto) {
    return this.reportService.publish(reportId, dto);
  }
}
