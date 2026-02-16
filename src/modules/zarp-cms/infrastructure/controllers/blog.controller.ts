import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BlogService } from '@/modules/zarp-cms/application/services/blog.service';
import { CreateBlogDTO } from '@/modules/zarp-cms/application/dtos/create-blog.dto';
import { UpdateBlogDTO } from '@/modules/zarp-cms/application/dtos/update-blog.dto';
import { AdminJwtGuard } from '@/shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '@/shared/auth/guards/tenant.guard';
import { RolesGuard } from '@/shared/auth/guards/roles.guard';
import { Roles } from '@/shared/auth/decorators/roles.decorator';
import { EAdminRole } from '@/modules/zarp-auth/domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '@/shared/auth/decorators/current-admin.decorator';

@ApiTags('CMS Blogs')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @Roles(EAdminRole.manager)
  @ApiOperation({ summary: 'Create a new blog in the current tenant' })
  @ApiResponse({ status: 201, description: 'Blog created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 409, description: 'Slug conflict.' })
  async create(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() createDto: CreateBlogDTO,
  ) {
    return this.blogService.create(admin.tenant_id!, createDto);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all blogs in the current tenant' })
  @ApiResponse({ status: 200, description: 'List of blogs.' })
  async findAll(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.blogService.findAll(admin.tenant_id!);
  }

  @Put(':blogId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ summary: 'Update blog metadata' })
  @ApiResponse({ status: 200, description: 'Blog updated successfully.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId', ParseIntPipe) blogId: number,
    @Body() updateDto: UpdateBlogDTO,
  ) {
    return this.blogService.update(admin.tenant_id!, blogId, updateDto);
  }

  @Delete(':blogId')
  @Roles(EAdminRole.manager)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a blog (and cascade delete articles)' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  async delete(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId', ParseIntPipe) blogId: number,
  ) {
    await this.blogService.delete(admin.tenant_id!, blogId);
    return { message: 'Blog deleted successfully' };
  }

  @Post(':blogId/regenerate-key')
  @Roles(EAdminRole.owner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate blog secret key' })
  @ApiResponse({ status: 200, description: 'New key returned.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  async regenerateKey(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId', ParseIntPipe) blogId: number,
  ) {
    return this.blogService.regenerateSecretKey(admin.tenant_id!, blogId);
  }
}
