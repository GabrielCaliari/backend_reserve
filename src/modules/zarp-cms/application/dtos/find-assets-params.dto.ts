import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EAssetStatus } from '../../domain/enums/asset-status.enum';

/**
 * DTO for filtering and paginating media assets
 * 
 * **Validates: Requirements 7.2**
 */
export class FindAssetsParamsDTO {
  @ApiPropertyOptional({
    description: 'Filter by collection ID (UUID)',
    example: 'a1b2c3d4e5f6',
    type: String,
  })
  @IsOptional()
  @IsString()
  collection_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by asset status',
    enum: EAssetStatus,
    example: EAssetStatus.ready,
  })
  @IsOptional()
  @IsEnum(EAssetStatus)
  status?: EAssetStatus;

  @ApiPropertyOptional({
    description: 'Filter by mime type',
    example: 'image/webp',
    type: String,
  })
  @IsOptional()
  @IsString()
  mime_type?: string;

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
