import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for detaching a media asset from an entity
 * 
 * **Validates: Requirements 7.13, 17.7**
 */
export class DetachMediaDTO {
  @ApiProperty({
    description: 'Media asset ID to detach (UUID string)',
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
    description: 'Relation type (e.g., featured, gallery, avatar, logo)',
    example: 'featured',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  relation_type: string;
}
