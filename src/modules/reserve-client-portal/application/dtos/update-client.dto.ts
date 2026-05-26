import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hotel_name?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  booking_engine?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  target_occupancy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  target_direct_pct?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
