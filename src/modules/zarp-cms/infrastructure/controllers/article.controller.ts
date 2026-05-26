import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ArticleService } from '../../application/services/article.service';
import { CreateArticleDTO } from '../../application/dtos/create-article.dto';
import { UpdateArticleDTO } from '../../application/dtos/update-article.dto';
import { PublishArticleDTO } from '../../application/dtos/publish-article.dto';
import { UpdatePublishedAtDTO } from '../../application/dtos/update-published-at.dto';
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
  @ApiOperation({
    summary: 'List articles',
    description: 'Without blogId: lists all articles across all blogs for the tenant. With blogId: lists articles of a specific blog.',
  })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Blog not found or does not belong to tenant' })
  async findAll(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Query('blogId') blogId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const filters = {
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    };

    if (blogId) {
      const result = await this.articleService.findByBlogId(blogId, filters, admin.tenant_id);
      if (result.status !== 200) {
        return res.status(result.status).json(result.data);
      }
      return res.status(200).json(ArticlePresenter.presentPaginated(result.data as any));
    }

    // No blogId — list all articles for the tenant
    const result = await this.articleService.findByTenantId(admin.tenant_id, filters);
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }
    return res.status(200).json(ArticlePresenter.presentPaginated(result.data as any));
  }

  @Get(':id')
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findOne(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.findById(id, admin.tenant_id);
    
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
  @ApiResponse({ status: 400, description: 'Validation error' })
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
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.delete(id, admin.tenant_id);
    
    if (result.status === 204) {
      return res.status(200).json({ message: 'Article deleted successfully' });
    }
    
    return res.status(result.status).json(result.data);
  }

  @Post(':id/publish')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Publish or schedule an article' })
  @ApiResponse({ status: 200, description: 'Article published or scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields or scheduledAt is in the past' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async publish(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Body() dto: PublishArticleDTO,
    @Res() res: Response,
  ) {
    const result = await this.articleService.publishArticle(id, admin.id, dto);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }

  @Patch(':id/published-at')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Edit the published_at date of a published or scheduled article' })
  @ApiResponse({ status: 200, description: 'Publication date updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Article must be in published or scheduled status' })
  async updatePublishedAt(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePublishedAtDTO,
    @Res() res: Response,
  ) {
    const result = await this.articleService.updatePublishedAt(
      id,
      new Date(dto.publishedAt),
      admin.id,
    );

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
  async archive(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('articleId') articleId: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.archive(articleId, admin.tenant_id);
    return res.status(result.status).json(result.data);
  }

  @Post(':articleId/unarchive')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Restore an archived article back to published status' })
  @ApiResponse({ status: 200, description: 'Article restored to published successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({ status: 409, description: 'Article is not in archived status' })
  async unarchive(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('articleId') articleId: string,
    @Res() res: Response,
  ) {
    const result = await this.articleService.unarchive(articleId, admin.tenant_id);
    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }
    const presented = ArticlePresenter.present(result.data as any);
    return res.status(result.status).json(presented);
  }
}
