import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ArticleService } from '../../application/services/article.service';
import { BlogSecretKeyGuard } from '../guards/blog-secret-key.guard';
import { Request } from 'express';

@ApiTags('CMS Public API')
@Controller('public')
@UseGuards(BlogSecretKeyGuard)
@ApiHeader({
  name: 'x-blog-secret-key',
  description: 'Blog secret key for authentication',
  required: true,
})
export class PublicBlogController {
  constructor(private readonly articleService: ArticleService) {}

  @Get('articles')
  @ApiOperation({
    summary: 'List published articles for a blog',
    description:
      'Returns only published articles. Draft and archived articles are excluded. Results are ordered by display_order ascending.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Articles per page (max: 50)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Published articles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              content: { type: 'string' },
              published_at: { type: 'string', format: 'date-time' },
              display_order: { type: 'number' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            total_pages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid page or limit query parameter' })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-blog-secret-key header' })
  async listArticles(
    @Req() req: Request & { blog: any },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<any> {
    // TODO(CACHE): Add Cache-Control: public, max-age=300
    // TODO(CACHE): Add ETag based on latest article updated_at

    const validatedPage = this.ensurePositiveInteger(page, 'page');
    const validatedLimit = this.ensurePositiveInteger(limit, 'limit');
    const maxLimit = Math.min(validatedLimit, 50);

    // Get blog ID from request (set by BlogSecretKeyGuard)
    const blogId = req.blog.id;

    const articles = await this.articleService.findPublishedByBlogId(
      blogId,
      validatedPage,
      maxLimit,
    );

    // Format response
    const data = articles.data.map((article) => ({
      id: article.id,
      title: article.displayTitle,
      slug: article.slug,
      content: article.content,
      published_at: article.publishedAt,
      display_order: article.displayOrder,
    }));

    return {
      data,
      meta: {
        page: articles.page,
        limit: articles.limit,
        total: articles.total,
        total_pages: articles.totalPages,
      },
    };
  }

  @Get('articles/:slug')
  @ApiOperation({
    summary: 'Retrieve a single published article by slug',
    description: 'Returns a single published article. Only articles with published status are accessible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Article retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        slug: { type: 'string' },
        content: { type: 'string' },
        status: { type: 'string', enum: ['published'] },
        published_at: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-blog-secret-key header' })
  @ApiResponse({ status: 404, description: 'Article not found or not in published status' })
  async getArticleBySlug(
    @Req() req: Request & { blog: any },
    @Param('slug') slug: string,
  ): Promise<any> {
    // TODO(CACHE): Add Cache-Control: public, max-age=600
    // TODO(CACHE): Add ETag based on article updated_at

    const blogId = req.blog.id;

    const article = await this.articleService.findPublishedBySlug(slug, blogId);

    if (!article) {
      throw new NotFoundException('Article not found or not in published status');
    }

    // Format response
    return {
      id: article.id,
      title: article.displayTitle,
      slug: article.slug,
      content: article.content,
      status: article.status,
      published_at: article.publishedAt,
      created_at: article.createdAt,
      updated_at: article.updatedAt,
    };
  }

  private ensurePositiveInteger(value: number, fieldName: 'page' | 'limit'): number {
    if (value < 1) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return value;
  }
}
