import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ArticleService } from '../../application/services/article.service';
import { CreateArticleDTO } from '../../application/dtos/create-article.dto';
import { UpdateArticleDTO } from '../../application/dtos/update-article.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';

@ApiTags('CMS Article Management')
@Controller('api/cms/blogs/:blogId/articles')
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant ID',
  required: true,
})
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Create a new article in draft status' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async create(
    @Param('blogId', ParseIntPipe) blogId: number,
    @Body() dto: CreateArticleDTO,
  ): Promise<any> {
    return this.articleService.create(blogId, dto);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all articles in a blog' })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  async findAll(
    @Param('blogId', ParseIntPipe) blogId: number,
    @Query('status') status?: string,
  ): Promise<any[]> {
    return this.articleService.findAllByBlogId(blogId, status);
  }

  @Get(':articleId')
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findOne(@Param('articleId', ParseIntPipe) articleId: number): Promise<any> {
    return this.articleService.findById(articleId);
  }

  @Put(':articleId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Update article content and metadata' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async update(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() dto: UpdateArticleDTO,
  ): Promise<any> {
    return this.articleService.update(articleId, dto);
  }

  @Delete(':articleId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Delete an article and its associated images' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async delete(@Param('articleId', ParseIntPipe) articleId: number): Promise<any> {
    await this.articleService.delete(articleId);
    return { message: 'Article deleted successfully' };
  }

  @Post(':articleId/publish')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Transition article status from draft to published' })
  @ApiResponse({ status: 200, description: 'Article published successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Article is not in draft status' })
  async publish(@Param('articleId', ParseIntPipe) articleId: number): Promise<any> {
    return this.articleService.publish(articleId);
  }

  @Post(':articleId/archive')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Transition article status from published to archived' })
  @ApiResponse({ status: 200, description: 'Article archived successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Article is not in published status' })
  async archive(@Param('articleId', ParseIntPipe) articleId: number): Promise<any> {
    return this.articleService.archive(articleId);
  }

  @Put('reorder')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Reorder articles within a blog' })
  @ApiResponse({ status: 200, description: 'Articles reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid article IDs' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async reorder(
    @Param('blogId', ParseIntPipe) blogId: number,
    @Body() body: { order: { id: number; display_order: number }[] },
  ): Promise<any> {
    await this.articleService.reorderArticles(blogId, body.order);
    return { message: 'Articles reordered successfully' };
  }
}
