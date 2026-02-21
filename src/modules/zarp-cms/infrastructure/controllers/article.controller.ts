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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ArticleService } from '../../application/services/article.service';
import { CreateArticleDTO } from '../../application/dtos/create-article.dto';
import { UpdateArticleDTO } from '../../application/dtos/update-article.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';

@ApiTags('CMS Article Management')
@Controller('articles')
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
  @ApiResponse({ status: 404, description: 'Blog or author not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists in this blog' })
  async create(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: CreateArticleDTO,
    @Res() res: Response,
  ) {
    const result = await this.articleService.createArticle(
      dto.blogId,
      dto,
      admin.id,
    );
    
    if (result.status !== 201) {
      return res.status(result.status).json(result.data);
    }

    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all articles with optional filters' })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  async findAll(
    @Query('blogId') blogId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    if (!blogId) {
      return res.status(400).json({
        code: '400:Blog ID is required',
        message: 'Blog ID query parameter is required',
      });
    }

    const filters = {
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    };

    const result = await this.articleService.findByBlogId(blogId, filters);
    
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    // Present the paginated result
    const presented = ArticlePresenter.presentPaginated(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Get(':id')
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findOne(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.findById(id);
    
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Put(':id')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Update article content and metadata' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or slug immutable for published articles' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists in this blog' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDTO,
    @Res() res: Response,
  ) {
    const result = await this.articleService.updateArticle(id, dto, admin.id);
    
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Delete(':id')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Delete an article and its associated relations' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async delete(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.delete(id);
    
    if (result.status === 204) {
      return res.status(200).json({ message: 'Article deleted successfully' });
    }
    
    return res.status(result.status).json(result.data);
  }

  @Post(':id/publish')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Publish an article (validates all required fields)' })
  @ApiResponse({ status: 200, description: 'Article published successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields or invalid image references' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async publish(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.publishArticle(id, admin.id);
    
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Post(':articleId/archive')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Transition article status from published to archived' })
  @ApiResponse({ status: 200, description: 'Article archived successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Article is not in published status' })
  async archive(@Param('articleId') articleId: string): Promise<any> {
    return this.articleService.archive(articleId);
  }

  @Put('reorder')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Reorder articles within a blog' })
  @ApiResponse({ status: 200, description: 'Articles reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid article IDs' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async reorder(
    @Param('blogId') blogId: string,
    @Body() body: { order: { id: string; display_order: number }[] },
  ): Promise<any> {
    await this.articleService.reorderArticles(blogId, body.order);
    return { message: 'Articles reordered successfully' };
  }
}
