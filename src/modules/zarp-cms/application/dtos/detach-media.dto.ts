import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, Min } from 'class-validator';

/**
 * DTO for detaching a media asset from an entity
 * 
 * **Validates: Requirements 7.13**
 */
export class DetachMediaDTO {
  @ApiProperty({
    description: 'Media asset ID to detach',
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
}
