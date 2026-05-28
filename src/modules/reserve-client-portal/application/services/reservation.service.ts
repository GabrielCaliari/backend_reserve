import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { successResponse, errorResponse } from '../../../../shared/helpers';
import { BookingEngineFactory } from '../../infrastructure/providers/booking-engine-factory.provider';
import { ProcessReservationUseCase } from '../use-cases/process-reservation.use-case';
import { CreateReservationDto } from '../dtos/reservation.dto';
import { EBookingEngineType, EReservationSource, EReservationStatus } from '../../domain/enums/reservation.enum';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingEngineFactory: BookingEngineFactory,
    private readonly processReservationUseCase: ProcessReservationUseCase,
  ) {}

  async processWebhook(
    tenantId: string,
    secret: string,
    payload: any,
    engineTypeHeader: string,
  ) {
    try {
      const hotelClient = await this.prisma.hotelClient.findFirst({
        where: { tenant_id: tenantId },
      });

      if (!hotelClient) {
        return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      }

      if (!hotelClient.webhook_secret || hotelClient.webhook_secret !== secret) {
        return errorResponse('401:INVALID_WEBHOOK_SECRET', 401);
      }

      const engineType = (engineTypeHeader?.toUpperCase() as EBookingEngineType) ?? hotelClient.booking_engine_type as EBookingEngineType;
      const adapter = this.bookingEngineFactory.getAdapter(engineType);
      const normalized = adapter.normalize(payload);

      await this.processReservationUseCase.execute(tenantId, engineType, normalized);

      return successResponse({ message: 'Reservation processed successfully' }, 200);
    } catch (error) {
      this.logger.error(`Webhook processing error for tenant ${tenantId}`, error);
      return errorResponse('500:WEBHOOK_PROCESSING_FAILED', 500, error);
    }
  }

  async createManual(tenantId: string, dto: CreateReservationDto, adminId: string) {
    try {
      const normalized = {
        external_id: dto.external_id,
        source: dto.source,
        status: dto.status ?? EReservationStatus.CONFIRMED,
        guest_name: dto.guest_name,
        guest_email: dto.guest_email,
        guest_phone: dto.guest_phone,
        guest_country: dto.guest_country,
        check_in: new Date(dto.check_in),
        check_out: new Date(dto.check_out),
        room_type: dto.room_type,
        total_amount: dto.total_amount,
        commission_amount: dto.commission_amount ?? 0,
        booking_date: new Date(dto.booking_date),
        raw_payload: { ...dto, created_by_admin: adminId },
      };

      await this.processReservationUseCase.execute(tenantId, EBookingEngineType.MANUAL, normalized);

      return successResponse({ message: 'Reservation created successfully' }, 201);
    } catch (error) {
      return errorResponse('500:RESERVATION_NOT_CREATED', 500, error);
    }
  }

  async findByTenantId(
    tenantId: string,
    page = 1,
    limit = 20,
    source?: EReservationSource,
    status?: EReservationStatus,
  ) {
    try {
      const where: any = { tenant_id: tenantId };
      if (source) where.source = source;
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        this.prisma.hotelReservation.findMany({
          where,
          orderBy: { booking_date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.hotelReservation.count({ where }),
      ]);

      return successResponse({
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return errorResponse('500:RESERVATIONS_NOT_LISTED', 500, error);
    }
  }

  async getStats(tenantId: string, from: Date, to: Date) {
    try {
      const reservations = await this.prisma.hotelReservation.findMany({
        where: {
          tenant_id: tenantId,
          booking_date: { gte: from, lte: to },
        },
        select: {
          source: true,
          status: true,
          total_amount: true,
          commission_amount: true,
          booking_window_days: true,
        },
      });

      const totalReservations = reservations.length;
      const directSources = [EReservationSource.DIRECT, EReservationSource.MANUAL];

      const directReservations = reservations.filter((r) => directSources.includes(r.source as EReservationSource));
      const otaReservations = reservations.filter((r) => !directSources.includes(r.source as EReservationSource));

      const directRevenue = directReservations.reduce((sum, r) => sum + r.total_amount, 0);
      const otaRevenue = otaReservations.reduce((sum, r) => sum + r.total_amount, 0);
      const totalCommission = reservations.reduce((sum, r) => sum + r.commission_amount, 0);

      const windowDays = reservations
        .map((r) => r.booking_window_days)
        .filter((d): d is number => d !== null && d !== undefined);
      const avgBookingWindow = windowDays.length > 0
        ? windowDays.reduce((sum, d) => sum + d, 0) / windowDays.length
        : 0;

      return successResponse({
        total_reservations: totalReservations,
        direct_count: directReservations.length,
        ota_count: otaReservations.length,
        direct_revenue: directRevenue,
        ota_revenue: otaRevenue,
        total_commission: totalCommission,
        avg_booking_window_days: Math.round(avgBookingWindow),
        period: { from, to },
      });
    } catch (error) {
      return errorResponse('500:RESERVATION_STATS_FAILED', 500, error);
    }
  }
}
