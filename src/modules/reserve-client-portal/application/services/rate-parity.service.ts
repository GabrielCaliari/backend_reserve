import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { InsertRateParityDto } from '../dtos/insert-rate-parity.dto';

@Injectable()
export class RateParityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: InsertRateParityDto, adminId: string) {
    try {
      const otaRates = [dto.booking_rate, dto.expedia_rate, dto.airbnb_rate].filter(
        (r): r is number => r !== undefined && r !== null,
      );

      const has_violation = otaRates.some((rate) => rate < dto.direct_rate);

      const record = await this.prisma.rateParityCheck.create({
        data: {
          client_id: clientId,
          check_date: new Date(dto.check_date),
          direct_rate: dto.direct_rate,
          booking_rate: dto.booking_rate ?? null,
          expedia_rate: dto.expedia_rate ?? null,
          airbnb_rate: dto.airbnb_rate ?? null,
          has_violation,
          notes: dto.notes ?? null,
          inserted_by: adminId,
        },
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:RATE_PARITY_NOT_SAVED', 500, error);
    }
  }

  async findByClientId(clientId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [records, total] = await this.prisma.$transaction([
        this.prisma.rateParityCheck.findMany({
          where: { client_id: clientId },
          orderBy: { check_date: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.rateParityCheck.count({ where: { client_id: clientId } }),
      ]);

      return successResponse({ records, total, page, limit });
    } catch (error) {
      return errorResponse('500:RATE_PARITY_NOT_FOUND', 500, error);
    }
  }

  async getViolations(clientId: string) {
    try {
      const records = await this.prisma.rateParityCheck.findMany({
        where: { client_id: clientId, has_violation: true },
        orderBy: { check_date: 'desc' },
        take: 10,
      });
      return successResponse(records);
    } catch (error) {
      return errorResponse('500:RATE_PARITY_VIOLATIONS_ERROR', 500, error);
    }
  }
}
