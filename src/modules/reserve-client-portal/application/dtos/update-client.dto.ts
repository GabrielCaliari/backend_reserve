import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ description: 'Nome do hotel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hotel_name?: string;

  @ApiPropertyOptional({ description: 'URL do logo' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Pais do hotel' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

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

  @ApiPropertyOptional({ description: 'Cliente ativo' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
