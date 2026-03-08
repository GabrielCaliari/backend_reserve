import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EArticleStatus } from '../../domain/enums/article-status.enum';

export class ArticleResponseDTO {
  @ApiProperty({
    description: 'Article ID (UUID)',
    example: 'ckn9012ijkl3',
  })
  id: string;

  @ApiProperty({
    description: 'Display title shown to readers',
    example: 'Getting Started with NestJS',
  })
  displayTitle: string;

  @ApiProperty({
    description: 'Article language in ll_cc format',
    example: 'en_us',
  })
  language: string;

  @ApiProperty({
    description: 'SEO meta title',
    example: 'NestJS Guide - Complete Tutorial',
  })
  metaTitle: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    example: 'Learn how to build scalable server-side applications',
  })
  metaDescription: string | null;

  @ApiPropertyOptional({
    description: 'SEO focus keyword',
    example: 'nestjs tutorial',
  })
  focusKeyword: string | null;

  @ApiProperty({
    description: 'Article content (markdown)',
    example: '# Introduction\n\nContent here...',
  })
  content: string;

  @ApiProperty({
    description: 'URL-safe slug',
    example: 'getting-started-with-nestjs',
  })
  slug: string;

  @ApiProperty({
    description: 'Article status',
    enum: EArticleStatus,
    example: EArticleStatus.draft,
  })
  status: EArticleStatus;

  @ApiProperty({
    description: 'Display order',
    example: 0,
  })
  displayOrder: number;

  @ApiPropertyOptional({
    description: 'Published date',
    example: '2026-02-19T10:00:00Z',
  })
  publishedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Cover image MediaAsset ID (UUID)',
    example: 'ckl1234abcd5',
  })
  coverImageId: string | null;

  @ApiProperty({
    description: 'Author ID (UUID)',
    example: 'ckm5678efgh9',
  })
  authorId: string;

  @ApiProperty({
    description: 'Blog ID (UUID)',
    example: 'abc123def456',
  })
  blogId: string;

  @ApiProperty({
    description: 'Admin ID who created the article',
    example: 1,
  })
  createdBy: number;

  @ApiPropertyOptional({
    description: 'Admin ID who last edited the article',
    example: 2,
  })
  lastEditedBy: number | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-02-19T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-02-19T12:00:00Z',
  })
  updatedAt: Date;
}
