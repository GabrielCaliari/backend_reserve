import { Injectable } from '@nestjs/common';
import { IBookingEngineAdapter, NormalizedReservation } from '../booking-engine-adapter.interface';
import { EReservationSource, EReservationStatus } from '../../../domain/enums/reservation.enum';

@Injectable()
export class GenericAdapter implements IBookingEngineAdapter {
  normalize(payload: any): NormalizedReservation {
    return {
      external_id: payload.external_id ?? payload.id ?? undefined,
      source: payload.source ?? EReservationSource.DIRECT,
      status: payload.status ?? EReservationStatus.CONFIRMED,
      guest_name: payload.guest_name ?? payload.guestName ?? 'Unknown',
      guest_email: payload.guest_email ?? payload.guestEmail,
      guest_phone: payload.guest_phone ?? payload.guestPhone,
      guest_country: payload.guest_country ?? payload.guestCountry,
      check_in: new Date(payload.check_in ?? payload.checkIn),
      check_out: new Date(payload.check_out ?? payload.checkOut),
      room_type: payload.room_type ?? payload.roomType,
      total_amount: Number(payload.total_amount ?? payload.totalAmount ?? 0),
      commission_amount: Number(payload.commission_amount ?? payload.commissionAmount ?? 0),
      booking_date: new Date(payload.booking_date ?? payload.bookingDate ?? new Date()),
      raw_payload: payload,
    };
  }
}
