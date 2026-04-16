import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBlockedPeriodDto {
  @ApiPropertyOptional({
    description: 'New start datetime (ISO 8601)',
    example: '2026-12-24T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDatetime?: string;

  @ApiPropertyOptional({
    description: 'New end datetime (ISO 8601)',
    example: '2026-12-24T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDatetime?: string;

  @ApiPropertyOptional({
    description: 'Label for the blocked period',
    example: 'Natal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
