import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GetSlotAvailabilityQueryDto {
  @ApiProperty({
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2026-06-10',
  })
  @IsDateString()
  date: string;
}
