import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional, IsObject, Min } from 'class-validator';

/**
 * DTO for attaching a media asset to an entity
 * 
 * **Validates: Requirements 7.12**
 */
export class AttachMediaDTO {
  @ApiProperty({
    description: 'Media asset ID to attach',
    example: 123,
    type: Number,
  })
  @IsInt()
  @Min(1)
  asset_id: number;

  @ApiProperty({
    description: 'Entity type (e.g., article, brand, company, user)',
    example: 'article',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({
    description: 'Entity ID',
    example: 456,
    type: Number,
  })
  @IsInt()
  @Min(1)
  entity_id: number;

  @ApiProperty({
    description: 'Relation type (e.g., featured, gallery, avatar, logo)',
    example: 'featured',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  relation_type: string;

  @ApiPropertyOptional({
    description: 'Display order for sorting (auto-assigned if not provided)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the relation',
    example: { featured: true },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
