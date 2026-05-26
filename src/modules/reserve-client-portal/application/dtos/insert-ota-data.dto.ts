import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';

export class InsertOtaDataDto {
  @IsString()
  client_id: string;

  @IsDateString()
  reference_month: string;

  @IsNumber()
  @Min(0)
  ota_bookings: number;

  @IsNumber()
  @Min(0)
  ota_revenue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission_paid?: number;

  @IsOptional()
  @IsObject()
  platform_breakdown?: Record<string, any>;
}
