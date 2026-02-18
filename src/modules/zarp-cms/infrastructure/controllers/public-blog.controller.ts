import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
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
              id: { type: 'number' },
              title: { type: 'string' },
              slug: { type: 'string' },
              content: { type: 'string' },
              published_at: { type: 'string', format: 'date-time' },
              display_order: { type: 'number' },
              images: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    url: { type: 'string' },
                    alt_text: { type: 'string' },
                    display_order: { type: 'number' },
                  },
                },
              },
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
  @ApiResponse({ status: 401, description: 'Missing or invalid x-blog-secret-key header' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async listArticles(
    @Req() req: Request & { blog: any },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<any> {
    // TODO(CACHE): Add Cache-Control: public, max-age=300
    // TODO(CACHE): Add ETag based on latest article updated_at

    // Limit max items per page
    const maxLimit = Math.min(limit, 50);

    // Get blog ID from request (set by BlogSecretKeyGuard)
    const blogId = req.blog.id;

    const articles = await this.articleService.findPublishedByBlogId(blogId);

    // Pagination
    const total = articles.length;
    const totalPages = Math.ceil(total / maxLimit);
    const startIndex = (page - 1) * maxLimit;
    const endIndex = startIndex + maxLimit;
    const paginatedArticles = articles.slice(startIndex, endIndex);

    // Format response
    const data = paginatedArticles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      published_at: article.published_at,
      display_order: article.display_order,
      images: (article.ArticleImage || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text,
        display_order: img.display_order,
      })),
    }));

    return {
      data,
      meta: {
        page,
        limit: maxLimit,
        total,
        total_pages: totalPages,
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
        id: { type: 'number' },
        title: { type: 'string' },
        slug: { type: 'string' },
        content: { type: 'string' },
        status: { type: 'string', enum: ['published'] },
        published_at: { type: 'string', format: 'date-time' },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              url: { type: 'string' },
              alt_text: { type: 'string' },
              display_order: { type: 'number' },
            },
          },
        },
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

    // Format response
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      status: article.status,
      published_at: article.published_at,
      images: (article.ArticleImage || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text,
        display_order: img.display_order,
      })),
      created_at: article.created_at,
      updated_at: article.updated_at,
    };
  }
}
