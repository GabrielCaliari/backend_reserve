import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const articleLanguagePattern = /^[a-z]{2}_[a-z]{2}$/;

export class CreateArticleDTO {
  @ApiProperty({
    description: 'Display title shown to readers',
    example: 'Getting Started with NestJS',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayTitle: string;

  @ApiPropertyOptional({
    description: 'Article language in ll_cc format',
    example: 'en_us',
    default: 'en_us',
    maxLength: 10,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(articleLanguagePattern, {
    message: 'language must follow ll_cc format, for example en_us or pt_br',
  })
  language?: string;

  @ApiProperty({
    description: 'SEO meta title (max 60 characters)',
    example: 'NestJS Guide - Complete Tutorial',
    maxLength: 60,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  metaTitle: string;

  @ApiPropertyOptional({
    description: 'SEO meta description (max 160 characters)',
    example: 'Learn how to build scalable server-side applications with NestJS framework',
    maxLength: 160,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO focus keyword',
    example: 'nestjs tutorial',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  focusKeyword?: string;

  @ApiProperty({
    description: 'Article content (markdown)',
    example: '# Introduction\n\nThis is the article content...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'URL-safe slug (lowercase, hyphens only)',
    example: 'getting-started-with-nestjs',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({
    description: 'Cover image MediaAsset ID (UUID)',
    example: 'ckl1234abcd5',
  })
  @IsString()
  @IsOptional()
  coverImageId?: string;

  @ApiProperty({
    description: 'Author ID (UUID)',
    example: 'ckm5678efgh9',
  })
  @IsString()
  @IsNotEmpty()
  authorId: string;

  @ApiProperty({
    description: 'Blog ID (UUID)',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  blogId: string;
}
