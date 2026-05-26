import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PublishArticleDTO {
  @ApiPropertyOptional({
    description: 'Schedule publication for a future date/time (ISO 8601). If omitted or in the past, publishes immediately.',
    example: '2026-06-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
