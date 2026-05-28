import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { NormalizedReservation } from '../../infrastructure/providers/booking-engine-adapter.interface';
import { EBookingEngineType, EReservationSource } from '../../domain/enums/reservation.enum';
import { EGuestSegment } from '../../domain/enums/guest-segment.enum';

@Injectable()
export class ProcessReservationUseCase {
  private readonly logger = new Logger(ProcessReservationUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(tenantId: string, engineType: EBookingEngineType, data: NormalizedReservation): Promise<void> {
    const bookingWindowDays = Math.max(
      0,
      Math.floor((data.check_in.getTime() - data.booking_date.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // 1. Upsert reservation
    const reservation = await this.prisma.hotelReservation.upsert({
      where: data.external_id
        ? { external_id: data.external_id } as any
        : { id: 'non-existent' },
      update: {
        status: data.status as any,
        total_amount: data.total_amount,
        commission_amount: data.commission_amount,
        raw_payload: data.raw_payload,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        external_id: data.external_id,
        engine_type: engineType as any,
        source: data.source as any,
        status: data.status as any,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        guest_country: data.guest_country,
        check_in: data.check_in,
        check_out: data.check_out,
        room_type: data.room_type,
        total_amount: data.total_amount,
        commission_amount: data.commission_amount,
        booking_date: data.booking_date,
        booking_window_days: bookingWindowDays,
        raw_payload: data.raw_payload,
        processed: false,
      },
    });

    // 2. Upsert guest
    let guest = data.guest_email
      ? await this.prisma.hotelGuest.findFirst({ where: { client_id: tenantId, email: data.guest_email } })
      : await this.prisma.hotelGuest.findFirst({ where: { client_id: tenantId, name: data.guest_name } });

    if (!guest) {
      guest = await this.prisma.hotelGuest.create({
        data: {
          client_id: tenantId,
          name: data.guest_name,
          email: data.guest_email,
          phone: data.guest_phone,
          country: data.guest_country,
          segment: EGuestSegment.leisure as any,
          booking_source: data.source,
          total_stays: 0,
          total_revenue: 0,
        },
      });
    }

    // 3. Create guest stay
    await this.prisma.guestStay.create({
      data: {
        guest_id: guest.id,
        check_in: data.check_in,
        check_out: data.check_out,
        room_type: data.room_type,
        revenue: data.total_amount,
        booking_source: data.source,
        booking_window_days: bookingWindowDays,
      },
    });

    // 4. Update guest stats
    await this.prisma.hotelGuest.update({
      where: { id: guest.id },
      data: {
        total_stays: { increment: 1 },
        total_revenue: { increment: data.total_amount },
        last_stay: data.check_in,
        first_stay: guest.first_stay ?? data.check_in,
      },
    });

    // 5. Mark as processed
    await this.prisma.hotelReservation.update({
      where: { id: reservation.id },
      data: { processed: true },
    });

    this.logger.log(`Reservation processed for tenant ${tenantId}: ${data.guest_name} (${data.source})`);
  }
}
