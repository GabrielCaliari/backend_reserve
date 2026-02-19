import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsObject } from 'class-validator';

/**
 * DTO for uploading media assets to a collection
 * 
 * **Validates: Requirements 7.1**
 */
export class UploadMediaDTO {
  @ApiProperty({
    description: 'Collection ID where the asset will be stored',
    example: 1,
    type: Number,
  })
  @IsInt()
  collection_id: number;

  @ApiPropertyOptional({
    description: 'Alternative text for accessibility',
    example: 'Company logo',
    type: String,
  })
  @IsOptional()
  @IsString()
  alt_text?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON object',
    example: { category: 'marketing', campaign: 'Q1-2024' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
