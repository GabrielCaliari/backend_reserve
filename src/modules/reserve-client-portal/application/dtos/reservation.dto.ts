import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EReservationSource, EReservationStatus } from '../../domain/enums/reservation.enum';

export class CreateReservationDto {
  @IsOptional() @IsString() external_id?: string;
  @IsEnum(EReservationSource) source: EReservationSource;
  @IsOptional() @IsEnum(EReservationStatus) status?: EReservationStatus;
  @IsString() guest_name: string;
  @IsOptional() @IsString() guest_email?: string;
  @IsOptional() @IsString() guest_phone?: string;
  @IsOptional() @IsString() guest_country?: string;
  @IsDateString() check_in: string;
  @IsDateString() check_out: string;
  @IsOptional() @IsString() room_type?: string;
  @IsNumber() @Min(0) total_amount: number;
  @IsOptional() @IsNumber() @Min(0) commission_amount?: number;
  @IsDateString() booking_date: string;
}

export class WebhookReservationDto {
  @IsString() tenant_id: string;
  @IsString() secret: string;
  reservation: CreateReservationDto;
}

export class UpdateHotelConfigDto {
  @IsOptional() @IsString() booking_engine_type?: string;
  @IsOptional() @IsNumber() @Min(1) total_rooms?: number;
  @IsOptional() @IsNumber() @Min(0) target_occupancy?: number;
  @IsOptional() @IsNumber() @Min(0) target_direct_pct?: number;
}
