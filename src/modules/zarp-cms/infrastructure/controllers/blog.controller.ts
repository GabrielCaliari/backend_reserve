import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BlogService } from '../../application/services/blog.service';
import { CreateBlogDTO } from '../../application/dtos/create-blog.dto';
import { UpdateBlogDTO } from '../../application/dtos/update-blog.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

@ApiTags('CMS Blogs')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @Roles(EAdminRole.manager)
  @ApiOperation({ 
    summary: 'Create a new blog in the current tenant',
    description: 'Creates a blog with a unique name per tenant. Returns a secret key for API access (only shown once).',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Blog created successfully. Returns blog data with secret_key (only returned on creation).',
    schema: {
      example: {
        id: 'abc123def456',
        name: 'Tech Blog',
        description: 'A blog about technology',
        tenantId: 1,
        active: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        secret_key: '64-character-hex-string',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 409, description: 'Blog name already exists for this tenant.' })
  async create(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() createDto: CreateBlogDTO,
    @Res() res: Response,
  ) {
    const result = await this.blogService.create(admin.tenant_id!, createDto);
    return res.status(result.status).json(result.data);
  }

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ 
    summary: 'List all blogs in the current tenant',
    description: 'Returns all blogs for the authenticated admin\'s tenant. Secret keys are not included.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of blogs.',
    schema: {
      example: [
        {
          id: 'abc123def456',
          name: 'Tech Blog',
          description: 'A blog about technology',
          tenantId: 1,
          active: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  async findAll(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.blogService.findAll(admin.tenant_id!);
    return res.status(result.status).json(result.data);
  }

  @Put(':blogId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ 
    summary: 'Update blog metadata',
    description: 'Updates blog name and/or description. Name must remain unique within the tenant.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog UUID (12-character string)',
    example: 'abc123def456',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Blog updated successfully.',
    schema: {
      example: {
        id: 'abc123def456',
        name: 'Updated Tech Blog',
        description: 'Updated description',
        tenantId: 1,
        active: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  @ApiResponse({ status: 409, description: 'Blog name already exists for this tenant.' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @Body() updateDto: UpdateBlogDTO,
    @Res() res: Response,
  ) {
    const result = await this.blogService.update(admin.tenant_id!, blogId, updateDto);
    return res.status(result.status).json(result.data);
  }

  @Delete(':blogId')
  @Roles(EAdminRole.manager)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete a blog (and cascade delete articles)',
    description: 'Soft deletes a blog and all associated articles. This action cannot be undone.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog UUID (12-character string)',
    example: 'abc123def456',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Blog deleted successfully.',
    schema: {
      example: {
        message: 'Blog deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  async delete(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @Res() res: Response,
  ) {
    const result = await this.blogService.delete(admin.tenant_id!, blogId);
    return res.status(result.status).json(result.data);
  }

  @Post(':blogId/regenerate-key')
  @Roles(EAdminRole.owner)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Regenerate blog secret key',
    description: 'Generates a new secret key for API access. The old key will be invalidated. The new key is only shown once.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog UUID (12-character string)',
    example: 'abc123def456',
    type: String,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'New secret key returned (only shown once).',
    schema: {
      example: {
        secret_key: '64-character-hex-string',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  async regenerateKey(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @Res() res: Response,
  ) {
    const result = await this.blogService.regenerateSecretKey(admin.tenant_id!, blogId);
    return res.status(result.status).json(result.data);
  }
}
