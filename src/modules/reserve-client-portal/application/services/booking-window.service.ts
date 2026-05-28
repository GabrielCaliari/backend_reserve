import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { InsertBookingWindowDto } from '../dtos/insert-booking-window.dto';

@Injectable()
export class BookingWindowService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(clientId: string, dto: InsertBookingWindowDto, adminId: string) {
    try {
      const referenceMonth = new Date(dto.reference_month);
      const total = dto.last_minute_count + dto.medium_term_count + dto.long_term_count;

      const last_minute_pct = total > 0 ? parseFloat(((dto.last_minute_count / total) * 100).toFixed(2)) : 0;
      const medium_term_pct = total > 0 ? parseFloat(((dto.medium_term_count / total) * 100).toFixed(2)) : 0;
      const long_term_pct = total > 0 ? parseFloat(((dto.long_term_count / total) * 100).toFixed(2)) : 0;

      const record = await this.prisma.bookingWindowMetric.upsert({
        where: {
          client_id_reference_month: {
            client_id: clientId,
            reference_month: referenceMonth,
          },
        },
        create: {
          client_id: clientId,
          reference_month: referenceMonth,
          last_minute_count: dto.last_minute_count,
          medium_term_count: dto.medium_term_count,
          long_term_count: dto.long_term_count,
          last_minute_pct,
          medium_term_pct,
          long_term_pct,
          inserted_by: adminId,
        },
        update: {
          last_minute_count: dto.last_minute_count,
          medium_term_count: dto.medium_term_count,
          long_term_count: dto.long_term_count,
          last_minute_pct,
          medium_term_pct,
          long_term_pct,
          inserted_by: adminId,
        },
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:BOOKING_WINDOW_NOT_SAVED', 500, error);
    }
  }

  async findByClientId(clientId: string, months = 6) {
    try {
      const records = await this.prisma.bookingWindowMetric.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: months,
      });
      return successResponse(records);
    } catch (error) {
      return errorResponse('500:BOOKING_WINDOW_NOT_FOUND', 500, error);
    }
  }
}
