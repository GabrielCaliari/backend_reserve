import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { InsertReputationDto } from '../dtos/insert-reputation.dto';

@Injectable()
export class ReputationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(clientId: string, dto: InsertReputationDto, adminId: string) {
    try {
      const referenceMonth = new Date(dto.reference_month);

      const record = await this.prisma.hotelReputationMetric.upsert({
        where: {
          client_id_reference_month: {
            client_id: clientId,
            reference_month: referenceMonth,
          },
        },
        create: {
          client_id: clientId,
          reference_month: referenceMonth,
          google_rating: dto.google_rating ?? null,
          google_reviews_count: dto.google_reviews_count ?? 0,
          tripadvisor_rating: dto.tripadvisor_rating ?? null,
          tripadvisor_reviews: dto.tripadvisor_reviews ?? 0,
          booking_rating: dto.booking_rating ?? null,
          booking_reviews: dto.booking_reviews ?? 0,
          overall_sentiment: dto.overall_sentiment ?? null,
          inserted_by: adminId,
        },
        update: {
          google_rating: dto.google_rating ?? null,
          google_reviews_count: dto.google_reviews_count ?? 0,
          tripadvisor_rating: dto.tripadvisor_rating ?? null,
          tripadvisor_reviews: dto.tripadvisor_reviews ?? 0,
          booking_rating: dto.booking_rating ?? null,
          booking_reviews: dto.booking_reviews ?? 0,
          overall_sentiment: dto.overall_sentiment ?? null,
          inserted_by: adminId,
        },
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:REPUTATION_NOT_SAVED', 500, error);
    }
  }

  async findByClientId(clientId: string, months = 6) {
    try {
      const records = await this.prisma.hotelReputationMetric.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: months,
      });
      return successResponse(records);
    } catch (error) {
      return errorResponse('500:REPUTATION_NOT_FOUND', 500, error);
    }
  }

  async getSummary(clientId: string) {
    try {
      const records = await this.prisma.hotelReputationMetric.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: 2,
      });

      if (records.length === 0) {
        return successResponse(null);
      }

      const current = records[0];
      const previous = records[1] ?? null;

      const trend = (curr: number | null, prev: number | null): 'up' | 'down' | 'stable' | 'no_data' => {
        if (curr === null || prev === null) return 'no_data';
        if (curr > prev) return 'up';
        if (curr < prev) return 'down';
        return 'stable';
      };

      const summary = {
        current,
        previous,
        trends: {
          google: trend(current.google_rating, previous?.google_rating ?? null),
          tripadvisor: trend(current.tripadvisor_rating, previous?.tripadvisor_rating ?? null),
          booking: trend(current.booking_rating, previous?.booking_rating ?? null),
        },
      };

      return successResponse(summary);
    } catch (error) {
      return errorResponse('500:REPUTATION_SUMMARY_ERROR', 500, error);
    }
  }
}
