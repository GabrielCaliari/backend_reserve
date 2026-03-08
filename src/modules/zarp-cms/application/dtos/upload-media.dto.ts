import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsObject } from 'class-validator';

/**
 * DTO for uploading media assets to a collection
 * 
 * **Validates: Requirements 7.1**
 */
export class UploadMediaDTO {
  @ApiProperty({
    description: 'Collection ID where the asset will be stored (UUID)',
    example: 'a1b2c3d4e5f6',
    type: String,
  })
  @IsString()
  collection_id: string;

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
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    try {
      return JSON.parse(trimmedValue);
    } catch {
      return value;
    }
  })
  @IsObject()
  metadata?: Record<string, any>;
}
