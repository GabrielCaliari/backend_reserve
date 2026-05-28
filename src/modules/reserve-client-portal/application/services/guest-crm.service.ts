import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { CreateGuestDto, CreateGuestStayDto } from '../dtos/create-guest.dto';
import { EGuestSegment } from '../../domain/enums/guest-segment.enum';

@Injectable()
export class GuestCrmService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateGuestDto) {
    try {
      const guest = await this.prisma.hotelGuest.create({
        data: {
          client_id: clientId,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          country: dto.country ?? null,
          segment: dto.segment ?? EGuestSegment.leisure,
          booking_source: dto.booking_source ?? null,
          notes: dto.notes ?? null,
        },
      });
      return successResponse(guest, 201);
    } catch (error) {
      return errorResponse('500:GUEST_NOT_CREATED', 500, error);
    }
  }

  async addStay(guestId: string, dto: CreateGuestStayDto) {
    try {
      const stay = await this.prisma.guestStay.create({
        data: {
          guest_id: guestId,
          check_in: new Date(dto.check_in),
          check_out: new Date(dto.check_out),
          room_type: dto.room_type ?? null,
          revenue: dto.revenue ?? 0,
          booking_source: dto.booking_source ?? null,
          booking_window_days: dto.booking_window_days ?? null,
          notes: dto.notes ?? null,
        },
      });

      const guest = await this.prisma.hotelGuest.findUnique({
        where: { id: guestId },
        select: { first_stay: true },
      });

      await this.prisma.hotelGuest.update({
        where: { id: guestId },
        data: {
          total_stays: { increment: 1 },
          total_revenue: { increment: dto.revenue ?? 0 },
          last_stay: new Date(dto.check_in),
          first_stay: guest?.first_stay ?? new Date(dto.check_in),
        },
      });

      return successResponse(stay, 201);
    } catch (error) {
      return errorResponse('500:STAY_NOT_ADDED', 500, error);
    }
  }

  async findByClientId(clientId: string, page = 1, limit = 20, segment?: EGuestSegment) {
    try {
      const skip = (page - 1) * limit;

      const where = {
        client_id: clientId,
        ...(segment ? { segment } : {}),
      };

      const [guests, total] = await this.prisma.$transaction([
        this.prisma.hotelGuest.findMany({
          where,
          orderBy: { last_stay: 'desc' },
          skip,
          take: limit,
          include: { _count: { select: { Stays: true } } },
        }),
        this.prisma.hotelGuest.count({ where }),
      ]);

      return successResponse({ guests, total, page, limit });
    } catch (error) {
      return errorResponse('500:GUESTS_NOT_FOUND', 500, error);
    }
  }

  async findById(guestId: string) {
    try {
      const guest = await this.prisma.hotelGuest.findUnique({
        where: { id: guestId },
        include: {
          Stays: { orderBy: { check_in: 'desc' } },
        },
      });

      if (!guest) {
        return errorResponse('404:GUEST_NOT_FOUND', 404);
      }

      return successResponse(guest);
    } catch (error) {
      return errorResponse('500:GUEST_FETCH_ERROR', 500, error);
    }
  }

  async getReactivationList(clientId: string) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const guests = await this.prisma.hotelGuest.findMany({
        where: {
          client_id: clientId,
          last_stay: {
            not: null,
            lt: sixMonthsAgo,
          },
        },
        orderBy: { last_stay: 'asc' },
        include: { _count: { select: { Stays: true } } },
      });

      return successResponse(guests);
    } catch (error) {
      return errorResponse('500:REACTIVATION_LIST_ERROR', 500, error);
    }
  }
}
