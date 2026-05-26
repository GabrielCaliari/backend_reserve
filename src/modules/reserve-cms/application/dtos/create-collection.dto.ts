import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, IsArray, Min } from 'class-validator';
import { ECollectionType } from '../../domain/enums/collection-type.enum';

/**
 * DTO for creating a new media collection
 * 
 * **Validates: Requirements 7.6**
 */
export class CreateCollectionDTO {
  @ApiProperty({
    description: 'Collection name',
    example: 'Brand Logos',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique slug for the collection (per tenant)',
    example: 'brand-logos',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Collection for storing brand logo images',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Collection type',
    enum: ECollectionType,
    example: ECollectionType.image,
  })
  @IsEnum(ECollectionType)
  type: ECollectionType;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 5000000,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_file_size?: number;

  @ApiPropertyOptional({
    description: 'Allowed mime types (supports wildcards like image/*)',
    example: ['image/jpeg', 'image/png', 'image/webp'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_mime_types?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of items allowed in collection',
    example: 20,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_items?: number;
}
