import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InsertRateParityDto {
  @IsDateString() check_date: string;
  @IsNumber() @Min(0) direct_rate: number;
  @IsOptional() @IsNumber() @Min(0) booking_rate?: number;
  @IsOptional() @IsNumber() @Min(0) expedia_rate?: number;
  @IsOptional() @IsNumber() @Min(0) airbnb_rate?: number;
  @IsOptional() @IsString() notes?: string;
}
