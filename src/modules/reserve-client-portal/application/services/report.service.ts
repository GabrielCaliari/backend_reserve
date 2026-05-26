import { Inject, Injectable } from '@nestjs/common';
import {
  REPORT_REPOSITORY,
  IReportRepository,
} from '../../domain/interfaces/report.repository.interface';
import { EReportStatus } from '../../domain/enums/report-status.enum';
import { CreateReportDto, PublishReportDto } from '../dtos/publish-report.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class ReportService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: IReportRepository,
  ) {}

  async createReport(dto: CreateReportDto) {
    try {
      const report = await this.reportRepository.createMonthlyReport({
        client_id: dto.client_id,
        reference_month: new Date(dto.reference_month),
        executive_summary: dto.executive_summary,
        highlights: dto.highlights,
        next_steps: dto.next_steps,
        admin_comment: dto.admin_comment,
      });

      return successResponse(report, 201);
    } catch (error) {
      return errorResponse('500:REPORT_NOT_CREATED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const report = await this.reportRepository.findReportById(id);
      if (!report) {
        return errorResponse('404:REPORT_NOT_FOUND', 404);
      }
      return successResponse(report);
    } catch (error) {
      return errorResponse('500:REPORT_NOT_FOUND', 500, error);
    }
  }

  async findByClientId(clientId: string, page = 1, limit = 12) {
    try {
      const result = await this.reportRepository.findReportsByClientId(clientId, page, limit);
      return successResponse({
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      return errorResponse('500:REPORTS_NOT_LISTED', 500, error);
    }
  }

  async submitForReview(id: string) {
    try {
      const report = await this.reportRepository.findReportById(id);
      if (!report) {
        return errorResponse('404:REPORT_NOT_FOUND', 404);
      }

      if (report.status !== EReportStatus.DRAFT) {
        return errorResponse('409:REPORT_NOT_IN_DRAFT_STATUS', 409);
      }

      const updated = await this.reportRepository.updateMonthlyReport(id, {
        status: EReportStatus.REVIEW,
      });

      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:REPORT_NOT_UPDATED', 500, error);
    }
  }

  async publish(id: string, dto: PublishReportDto) {
    try {
      const report = await this.reportRepository.findReportById(id);
      if (!report) {
        return errorResponse('404:REPORT_NOT_FOUND', 404);
      }

      if (report.status === EReportStatus.PUBLISHED) {
        return errorResponse('409:REPORT_ALREADY_PUBLISHED', 409);
      }

      const updated = await this.reportRepository.updateMonthlyReport(id, {
        ...dto,
        status: EReportStatus.PUBLISHED,
        published_at: new Date(),
      });

      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:REPORT_NOT_PUBLISHED', 500, error);
    }
  }
}
