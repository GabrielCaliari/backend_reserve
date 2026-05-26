import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsObject,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateStatsIntegrationDto {
  @ApiProperty({
    description: 'Integration key matching a registered IExternalMetricProvider',
    example: 'google_search_console',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  key: string;

  @ApiProperty({
    description: 'Human-readable label for this integration instance',
    example: 'GSC - Reserve.com.br',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiProperty({
    description: 'Provider-specific configuration (API keys, site URLs, etc.)',
    example: { site_url: 'https://Reserve.com.br', service_account_key: '{...}' },
  })
  @IsObject()
  config: Record<string, any>;
}

export class UpdateStatsIntegrationDto {
  @ApiPropertyOptional({ example: 'GSC - Reserve.com.br (updated)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class StatsIntegrationResponseDto {
  @ApiProperty({ example: 1 })
  id: string;

  @ApiProperty({ example: 3 })
  tenant_id: string;

  @ApiProperty({ example: 'google_search_console' })
  key: string;

  @ApiProperty({ example: 'GSC - Reserve.com.br' })
  label: string;

  @ApiProperty({
    description: 'Config with secret fields masked',
    example: { site_url: 'https://Reserve.com.br', service_account_key: '***' },
  })
  config: Record<string, any>;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class AvailableIntegrationDto {
  @ApiProperty({ example: 'google_search_console' })
  key: string;

  @ApiProperty({ example: 'Google Search Console' })
  label: string;

  @ApiProperty({ example: 'SEO performance metrics from Google Search Console' })
  description: string;

  @ApiProperty({
    description: 'Required and optional config fields with descriptions',
    example: {
      site_url: { type: 'string', required: true, description: 'Property URL' },
      service_account_key: { type: 'json', required: true, secret: true, description: 'GCP service account JSON key' },
    },
  })
  configSchema: Record<string, any>;
}
