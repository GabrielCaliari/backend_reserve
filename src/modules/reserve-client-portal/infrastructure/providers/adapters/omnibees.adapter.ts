import { Injectable } from '@nestjs/common';
import { IBookingEngineAdapter, NormalizedReservation } from '../booking-engine-adapter.interface';
import { EReservationSource, EReservationStatus } from '../../../domain/enums/reservation.enum';

@Injectable()
export class OmnibeesAdapter implements IBookingEngineAdapter {
  // TODO: Map Omnibees webhook payload fields to NormalizedReservation
  // Omnibees sends POST to your webhook URL on new/updated reservations
  // Reference: https://omnibees.com/developers (check Omnibees partner docs)
  normalize(payload: any): NormalizedReservation {
    const sourceMap: Record<string, EReservationSource> = {
      'direct': EReservationSource.DIRECT,
      'booking.com': EReservationSource.BOOKING_COM,
      'expedia': EReservationSource.EXPEDIA,
      'airbnb': EReservationSource.AIRBNB,
    };

    return {
      external_id: payload.reservationId ?? payload.id,
      source: sourceMap[payload.channel?.toLowerCase()] ?? EReservationSource.OTHER_OTA,
      status: payload.status === 'confirmed' ? EReservationStatus.CONFIRMED : EReservationStatus.CANCELLED,
      guest_name: `${payload.guestFirstName ?? ''} ${payload.guestLastName ?? ''}`.trim() || 'Unknown',
      guest_email: payload.guestEmail,
      guest_phone: payload.guestPhone,
      guest_country: payload.guestCountry,
      check_in: new Date(payload.checkInDate),
      check_out: new Date(payload.checkOutDate),
      room_type: payload.roomType ?? payload.roomName,
      total_amount: Number(payload.totalAmount ?? payload.totalValue ?? 0),
      commission_amount: Number(payload.commissionAmount ?? payload.commission ?? 0),
      booking_date: new Date(payload.createdAt ?? payload.bookingDate ?? new Date()),
      raw_payload: payload,
    };
  }
}
