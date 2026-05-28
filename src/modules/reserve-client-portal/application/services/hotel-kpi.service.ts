import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { InsertMonthlyKpiDto } from '../dtos/insert-monthly-kpi.dto';

@Injectable()
export class HotelKpiService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(clientId: string, dto: InsertMonthlyKpiDto, adminId: string) {
    try {
      const referenceMonth = new Date(dto.reference_month);
      const revpar = dto.total_rooms > 0
        ? (dto.occupied_rooms * dto.adr) / dto.total_rooms
        : 0;

      const record = await this.prisma.hotelMonthlyKpi.upsert({
        where: {
          client_id_reference_month: {
            client_id: clientId,
            reference_month: referenceMonth,
          },
        },
        create: {
          client_id: clientId,
          reference_month: referenceMonth,
          total_rooms: dto.total_rooms,
          occupied_rooms: dto.occupied_rooms,
          adr: dto.adr,
          revpar,
          total_revenue: dto.total_revenue,
          direct_revenue: dto.direct_revenue,
          inserted_by: adminId,
        },
        update: {
          total_rooms: dto.total_rooms,
          occupied_rooms: dto.occupied_rooms,
          adr: dto.adr,
          revpar,
          total_revenue: dto.total_revenue,
          direct_revenue: dto.direct_revenue,
          inserted_by: adminId,
        },
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:KPI_NOT_SAVED', 500, error);
    }
  }

  async findByClientId(clientId: string, months = 6) {
    try {
      const records = await this.prisma.hotelMonthlyKpi.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: months,
      });
      return successResponse(records);
    } catch (error) {
      return errorResponse('500:KPI_NOT_FOUND', 500, error);
    }
  }

  async getSummary(clientId: string) {
    try {
      const records = await this.prisma.hotelMonthlyKpi.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: 2,
      });

      if (records.length === 0) {
        return successResponse(null);
      }

      const current = records[0];
      const previous = records[1] ?? null;

      const pctChange = (curr: number, prev: number | null): number | null => {
        if (prev === null || prev === 0) return null;
        return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
      };

      const currentOccupancy = current.total_rooms > 0
        ? (current.occupied_rooms / current.total_rooms) * 100
        : 0;

      const previousOccupancy = previous && previous.total_rooms > 0
        ? (previous.occupied_rooms / previous.total_rooms) * 100
        : null;

      const summary = {
        current: { ...current, occupancy_pct: parseFloat(currentOccupancy.toFixed(2)) },
        previous: previous
          ? { ...previous, occupancy_pct: parseFloat(((previous.occupied_rooms / previous.total_rooms) * 100).toFixed(2)) }
          : null,
        changes: {
          revpar_pct: pctChange(current.revpar, previous?.revpar ?? null),
          adr_pct: pctChange(current.adr, previous?.adr ?? null),
          occupancy_pct: pctChange(currentOccupancy, previousOccupancy),
        },
      };

      return successResponse(summary);
    } catch (error) {
      return errorResponse('500:KPI_SUMMARY_ERROR', 500, error);
    }
  }
}
