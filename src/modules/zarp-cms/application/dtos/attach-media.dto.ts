import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, Min, IsInt, IsIn } from 'class-validator';

/**
 * DTO for attaching a media asset to an entity
 * 
 * **Validates: Requirements 7.12, 17.7**
 */
export class AttachMediaDTO {
  @ApiProperty({
    description: 'Media asset ID to attach (UUID string)',
    example: 'a1b2c3d4e5f6',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  asset_id: string;

  @ApiProperty({
    description: 'Entity type (e.g., article, brand, company, user)',
    example: 'article',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({
    description: 'Entity ID (UUID string or integer as string)',
    example: 'x9y8z7w6v5u4',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  entity_id: string;

  @ApiProperty({
    description: 'Entity ID type discriminator (uuid for Article/Author, int for others)',
    example: 'uuid',
    enum: ['uuid', 'int'],
    type: String,
  })
  @IsString()
  @IsIn(['uuid', 'int'])
  entity_id_type: 'uuid' | 'int';

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
