import { IsEnum, IsOptional, IsString, IsEmail, IsNumber, Min } from 'class-validator';
import { EGuestSegment } from '../../domain/enums/guest-segment.enum';

export class CreateGuestDto {
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsEnum(EGuestSegment) segment?: EGuestSegment;
  @IsOptional() @IsString() booking_source?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateGuestStayDto {
  @IsString() check_in: string;
  @IsString() check_out: string;
  @IsOptional() @IsString() room_type?: string;
  @IsOptional() @IsNumber() @Min(0) booking_window_days?: number;
  @IsOptional() @IsNumber() @Min(0) revenue?: number;
  @IsOptional() @IsString() booking_source?: string;
  @IsOptional() @IsString() notes?: string;
}
