import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

/**
 * DTO for updating media asset metadata
 * Only alt_text and metadata fields can be updated per requirements
 * 
 * **Validates: Requirements 7.4, 1.8**
 */
export class UpdateAssetDTO {
  @ApiPropertyOptional({
    description: 'Alternative text for accessibility',
    example: 'Updated company logo',
    type: String,
  })
  @IsOptional()
  @IsString()
  alt_text?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON object',
    example: { category: 'branding', updated: true },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
