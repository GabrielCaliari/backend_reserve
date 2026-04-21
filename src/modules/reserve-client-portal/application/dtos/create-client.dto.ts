import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  IsEmail,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from '../../../../shared/validators';

export class CreateClientDto {
  @IsString()
  tenant_id: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;

  @IsString()
  @MaxLength(255)
  hotel_name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo_url?: string;

  @IsString()
  @MaxLength(100)
  country: string;

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

  @IsDateString()
  contract_start: string;
}
