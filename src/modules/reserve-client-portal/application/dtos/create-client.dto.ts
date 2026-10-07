import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ description: 'Tenant (hotel) ao qual o cliente pertence' })
  @IsString()
  tenant_id: string;

  @ApiProperty({ description: 'E-mail do admin do hotel; cria o admin se ainda nao existir' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Senha inicial (forte); gerada se omitida' })
  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;

  @ApiProperty({ description: 'Nome do hotel' })
  @IsString()
  @MaxLength(255)
  hotel_name: string;

  @ApiPropertyOptional({ description: 'URL do logo' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo_url?: string;

  @ApiProperty({ description: 'Pais do hotel' })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({ description: 'Motor de reservas; ROI nivel 3 exige diferente de manual', example: 'hospedin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  booking_engine?: string;

  @ApiPropertyOptional({ description: 'Meta de ocupacao (0 a 1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  target_occupancy?: number;

  @ApiPropertyOptional({ description: 'Meta de reservas diretas (0 a 1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  target_direct_pct?: number;

  @ApiProperty({ description: 'Inicio do contrato (ISO 8601)' })
  @IsDateString()
  contract_start: string;
}
