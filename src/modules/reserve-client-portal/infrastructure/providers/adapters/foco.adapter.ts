import { Injectable } from '@nestjs/common';
import { IBookingEngineAdapter, NormalizedReservation } from '../booking-engine-adapter.interface';
import { EReservationSource, EReservationStatus } from '../../../domain/enums/reservation.enum';

@Injectable()
export class FocoAdapter implements IBookingEngineAdapter {
  // TODO: Map Foco Reservas webhook payload to NormalizedReservation
  // Contact Foco support for webhook payload documentation
  normalize(payload: any): NormalizedReservation {
    return {
      external_id: payload.id,
      source: EReservationSource.DIRECT,
      status: EReservationStatus.CONFIRMED,
      guest_name: payload.guest?.name ?? payload.nome ?? 'Unknown',
      guest_email: payload.guest?.email ?? payload.email,
      guest_phone: payload.guest?.phone ?? payload.telefone,
      guest_country: payload.guest?.country ?? payload.pais,
      check_in: new Date(payload.checkIn ?? payload.dataEntrada),
      check_out: new Date(payload.checkOut ?? payload.dataSaida),
      room_type: payload.quarto ?? payload.roomType,
      total_amount: Number(payload.valorTotal ?? payload.total ?? 0),
      commission_amount: Number(payload.comissao ?? 0),
      booking_date: new Date(payload.dataCriacao ?? payload.createdAt ?? new Date()),
      raw_payload: payload,
    };
  }
}
