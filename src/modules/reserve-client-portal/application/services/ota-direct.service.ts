import { Inject, Injectable } from '@nestjs/common';
import {
  REPORT_REPOSITORY,
  IReportRepository,
} from '../../domain/interfaces/report.repository.interface';
import { InsertOtaDataDto } from '../dtos/insert-ota-data.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class OtaDirectService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: IReportRepository,
  ) {}

  async insertOtaData(dto: InsertOtaDataDto, adminId: string) {
    try {
      const data = await this.reportRepository.upsertOtaMonthlyData({
        client_id: dto.client_id,
        reference_month: new Date(dto.reference_month),
        ota_bookings: dto.ota_bookings,
        ota_revenue: dto.ota_revenue,
        commission_rate: dto.commission_rate,
        commission_paid: dto.commission_paid,
        platform_breakdown: dto.platform_breakdown,
        inserted_by: adminId,
      });

      return successResponse(data, 201);
    } catch (error) {
      return errorResponse('500:OTA_DATA_NOT_SAVED', 500, error);
    }
  }

  async getOtaData(clientId: string, from: Date, to: Date) {
    try {
      const data = await this.reportRepository.findOtaDataByClientId(clientId, from, to);
      return successResponse(data);
    } catch (error) {
      return errorResponse('500:OTA_DATA_NOT_FOUND', 500, error);
    }
  }
}
