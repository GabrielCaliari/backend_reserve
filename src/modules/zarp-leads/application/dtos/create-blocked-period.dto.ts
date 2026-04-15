import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBlockedPeriodDto {
  @ApiProperty({
    description: 'Start datetime in ISO format',
    example: '2026-06-10T09:00:00Z',
  })
  @IsDateString()
  startDatetime: string;

  @ApiProperty({
    description: 'End datetime in ISO format',
    example: '2026-06-10T17:00:00Z',
  })
  @IsDateString()
  endDatetime: string;

  @ApiPropertyOptional({
    description: 'Optional label for the blocked period',
    example: 'Holiday',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
