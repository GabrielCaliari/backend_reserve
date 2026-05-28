import { EReservationSource, EReservationStatus } from '../../domain/enums/reservation.enum';

export interface NormalizedReservation {
  external_id?: string;
  source: EReservationSource;
  status: EReservationStatus;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  check_in: Date;
  check_out: Date;
  room_type?: string;
  total_amount: number;
  commission_amount: number;
  booking_date: Date;
  raw_payload: any;
}

export interface IBookingEngineAdapter {
  normalize(payload: any): NormalizedReservation;
}
