import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPurchasesQueryDTO {
  @ApiPropertyOptional({ enum: ['all', 'pending', 'completed', 'abandoned', 'refunded'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'pending', 'completed', 'abandoned', 'refunded'])
  status?: 'all' | 'pending' | 'completed' | 'abandoned' | 'refunded';

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
