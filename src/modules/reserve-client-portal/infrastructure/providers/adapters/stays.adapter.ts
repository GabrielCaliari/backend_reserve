import { Injectable } from '@nestjs/common';
import { IBookingEngineAdapter, NormalizedReservation } from '../booking-engine-adapter.interface';
import { EReservationSource, EReservationStatus } from '../../../domain/enums/reservation.enum';

@Injectable()
export class StaysAdapter implements IBookingEngineAdapter {
  // TODO: Map Stays.net webhook payload to NormalizedReservation
  // Stays.net API docs: https://api.stays.net/docs
  normalize(payload: any): NormalizedReservation {
    return {
      external_id: payload.id ?? payload._id,
      source: EReservationSource.DIRECT,
      status: EReservationStatus.CONFIRMED,
      guest_name: payload.guest?.name ?? payload.guestName ?? 'Unknown',
      guest_email: payload.guest?.email,
      guest_phone: payload.guest?.phone,
      guest_country: payload.guest?.country,
      check_in: new Date(payload.checkIn),
      check_out: new Date(payload.checkOut),
      room_type: payload.room?.name,
      total_amount: Number(payload.price?.total ?? 0),
      commission_amount: 0,
      booking_date: new Date(payload.createdAt ?? new Date()),
      raw_payload: payload,
    };
  }
}
