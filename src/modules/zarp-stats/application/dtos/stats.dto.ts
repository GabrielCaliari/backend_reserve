import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601). Defaults to 30 days ago.',
    example: '2026-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601). Defaults to today.',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class MetricValueResponseDto {
  @ApiProperty({ example: 'leads.total' })
  key: string;

  @ApiProperty({ example: 'Total Leads' })
  label: string;

  @ApiProperty({ example: 142 })
  value: number | string;

  @ApiPropertyOptional({ example: 'count' })
  unit?: string;

  @ApiPropertyOptional({
    description: 'Percentage change vs previous period',
    example: 12.5,
  })
  trend?: number;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class MetricGroupResponseDto {
  @ApiProperty({ example: 'leads' })
  moduleKey: string;

  @ApiProperty({ example: 'Lead Management' })
  label: string;

  @ApiPropertyOptional({ example: 'Metrics from the lead capture system' })
  description?: string;

  @ApiProperty({ type: [MetricValueResponseDto] })
  metrics: MetricValueResponseDto[];

  @ApiProperty()
  fetchedAt: Date;

  @ApiPropertyOptional({ description: 'Error message if this provider failed' })
  error?: string;
}

export class DashboardResponseDto {
  @ApiProperty({ type: [MetricGroupResponseDto] })
  groups: MetricGroupResponseDto[];

  @ApiProperty({ example: '2026-03-07T15:00:00.000Z' })
  generatedAt: Date;
}
