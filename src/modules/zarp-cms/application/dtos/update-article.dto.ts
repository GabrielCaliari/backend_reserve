import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateArticleDTO {
  @ApiPropertyOptional({
    description: 'Display title shown to readers',
    example: 'Updated Article Title',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta title (max 60 characters)',
    example: 'Updated Meta Title',
    maxLength: 60,
  })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description (max 160 characters)',
    example: 'Updated meta description for better SEO',
    maxLength: 160,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO focus keyword',
    example: 'updated keyword',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  focusKeyword?: string;

  @ApiPropertyOptional({
    description: 'Article content (markdown)',
    example: '# Updated Introduction\n\nThis is the updated content...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Cover image MediaAsset ID (UUID)',
    example: 'ckl1234abcd5',
  })
  @IsString()
  @IsOptional()
  coverImageId?: string;

  @ApiPropertyOptional({
    description: 'Author ID (UUID)',
    example: 'ckm5678efgh9',
  })
  @IsString()
  @IsOptional()
  authorId?: string;
}
