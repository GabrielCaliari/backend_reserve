import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, Min } from 'class-validator';

/**
 * DTO for updating an existing media collection
 * 
 * **Validates: Requirements 7.10**
 */
export class UpdateCollectionDTO {
  @ApiPropertyOptional({
    description: 'Collection name',
    example: 'Brand Logos Updated',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Updated description for brand logos',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 10000000,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_file_size?: number;

  @ApiPropertyOptional({
    description: 'Allowed mime types (supports wildcards like image/*)',
    example: ['image/*', 'application/pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_mime_types?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of items allowed in collection',
    example: 50,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_items?: number;
}
