import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class UpdatePublishedAtDTO {
  @ApiProperty({
    description: 'New published_at timestamp (ISO 8601). If in the future, article is rescheduled. If in the past, corrects the publication date.',
    example: '2026-05-20T14:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  publishedAt: string;
}
