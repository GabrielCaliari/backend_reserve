import { IsDateString, IsNumber, Min } from 'class-validator';

export class InsertBookingWindowDto {
  @IsDateString() reference_month: string;
  @IsNumber() @Min(0) last_minute_count: number;
  @IsNumber() @Min(0) medium_term_count: number;
  @IsNumber() @Min(0) long_term_count: number;
}
