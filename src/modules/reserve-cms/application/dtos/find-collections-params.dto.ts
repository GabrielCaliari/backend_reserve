import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ECollectionType } from '../../domain/enums/collection-type.enum';

/**
 * DTO for filtering and paginating media collections
 * 
 * **Validates: Requirements 7.7**
 */
export class FindCollectionsParamsDTO {
  @ApiPropertyOptional({
    description: 'Filter by collection type',
    enum: ECollectionType,
    example: ECollectionType.image,
  })
  @IsOptional()
  @IsEnum(ECollectionType)
  type?: ECollectionType;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    type: Number,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
