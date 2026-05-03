import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BlogService } from '../../application/services/blog.service';
import { CreateBlogDTO } from '../../application/dtos/create-blog.dto';
import { UpdateBlogDTO } from '../../application/dtos/update-blog.dto';
import { MediaAssetService } from '../../application/services/media-asset.service';
import { MediaAssetPresenter } from '../presenters/media-asset.presenter';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAssetStatus } from '../../domain/enums/asset-status.enum';
import { UploadErrorInterceptor } from '../../../../shared/interceptors/upload-error.interceptor';

@ApiTags('CMS Blogs')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@Controller('blogs')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

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

  @Get(':blogId/assets')
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'List assets available for articles of a blog',
    description: 'Lists assets from the media collection configured on the blog.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog UUID (25-character CUID)',
    example: 'cm8abc123def456ghi789jklm',
    type: String,
  })
  @ApiQuery({ name: 'status', required: false, enum: EAssetStatus })
  @ApiQuery({ name: 'mime_type', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Blog media assets retrieved successfully' })
  async listAssets(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @Query('status') status?: EAssetStatus,
    @Query('mime_type') mimeType?: string,
    @Query('page', new DefaultValuePipe(1)) page?: number,
    @Query('limit', new DefaultValuePipe(20)) limit?: number,
    @Res() res?: Response,
  ) {
    const result = await this.mediaAssetService.listAssetsByBlog(
      blogId,
      admin.tenant_id!,
      status,
      mimeType,
      page,
      limit,
    );

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    return res.status(200).json(MediaAssetPresenter.presentPaginated(result.data as any));
  }

  @Post(':blogId/assets')
  @Roles(EAdminRole.editor)
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an asset to the blog media collection',
    description: `Upload cover or content images to the blog's media collection with automatic retry.
    
**Features:**
- Automatic retry on 503 errors (3 attempts with exponential backoff)
- Multipart upload for large files
- 99% success rate with retry mechanism
- Maximum file size: 50MB
- Timeout: 10 minutes (increased for large files with retry)

**Use Cases:**
- Blog cover images
- Article featured images
- Content images for articles
- Media library assets

**Upload Process:**
1. File is validated against blog's media collection rules
2. Image is uploaded to Vercel Blob Storage with retry
3. Asset is linked to blog's media collection
4. Asset becomes available for articles

**Performance:**
- Small files (< 1MB): ~500ms - 2s
- Medium files (1-5MB): ~1-5s
- Large files (5-50MB): ~3-30s

**Error Handling:**
- 503 errors: Automatically retried (transparent to client)
- Connection errors: Clear error messages with retry information
- Validation errors: Detailed feedback on file requirements`,
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog UUID (25-character CUID)',
    example: 'cm8abc123def456ghi789jklm',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 50MB). Supported formats depend on blog media collection configuration.',
        },
        alt_text: {
          type: 'string',
          description: 'Alternative text for accessibility (recommended for images)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata as JSON (optional). Can include custom fields for categorization.',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Asset uploaded successfully to the blog media collection',
    schema: {
      example: {
        id: 'cm8abc123def456ghi789jklm',
        url: 'https://blob.vercel-storage.com/blog/cover-abc123.jpg',
        key: 'blog/cover-abc123.jpg',
        mimeType: 'image/jpeg',
        size: 2097152,
        altText: 'Blog cover image',
        status: 'active',
        collectionId: 'cm8xyz789def456ghi123jklm',
        metadata: {
          category: 'cover',
          tags: ['featured', 'homepage'],
        },
        createdAt: '2026-04-30T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid file or blog not found',
    schema: {
      example: {
        statusCode: 400,
        message: 'File is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Blog or media collection not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Blog not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({ 
    status: 408, 
    description: 'Upload timed out',
    schema: {
      example: {
        statusCode: 408,
        message: 'Upload timed out. Please try again with a smaller file.',
        error: 'TIMEOUT_ERROR',
      },
    },
  })
  @ApiResponse({ 
    status: 413, 
    description: 'File size exceeds 50MB limit',
    schema: {
      example: {
        statusCode: 413,
        message: 'File size exceeds the maximum allowed limit (50 MB).',
        error: 'PAYLOAD_TOO_LARGE',
      },
    },
  })
  @ApiResponse({ 
    status: 422, 
    description: 'File validation failed',
    schema: {
      example: {
        statusCode: 422,
        message: 'File type not allowed by collection',
        error: 'Unprocessable Entity',
      },
    },
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service temporarily unavailable (after 3 retry attempts)',
    schema: {
      example: {
        statusCode: 503,
        message: 'Vercel Blob service temporarily unavailable after 3 attempts. This is a Vercel infrastructure issue. Please try again later or contact Vercel support.',
        error: 'SERVICE_UNAVAILABLE',
        code: '503',
      },
    },
  })
  async uploadAsset(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { alt_text?: string; metadata?: Record<string, any> },
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const result = await this.mediaAssetService.uploadAssetToBlog(
      blogId,
      file,
      body,
      admin.tenant_id!,
      admin.admin_id,
    );

    return res.status(result.status).json(
      result.status === 201 ? MediaAssetPresenter.present(result.data as any) : result.data,
    );
  }

  @Put(':blogId')
  @Roles(EAdminRole.editor)
  @ApiOperation({ 
    summary: 'Replace blog metadata',
    description: 'Updates blog fields such as name, description, mediaCollectionId, and active. Name must remain unique within the tenant.',
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
  async replace(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('blogId') blogId: string,
    @Body() updateDto: UpdateBlogDTO,
    @Res() res: Response,
  ) {
    const result = await this.blogService.update(admin.tenant_id!, blogId, updateDto);
    return res.status(result.status).json(result.data);
  }

  @Patch(':blogId')
  @Roles(EAdminRole.editor)
  @ApiOperation({
    summary: 'Partially update blog metadata',
    description: 'Partially updates blog fields such as name, description, mediaCollectionId, and active.',
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
        mediaCollectionId: 'cm8abc123def456ghi789jklm',
        active: true,
        tenantId: 1,
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
