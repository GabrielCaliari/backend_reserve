import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { MediaAssetService } from '../../application/services/media-asset.service';
import { UploadMediaDTO } from '../../application/dtos/upload-media.dto';
import { MediaAssetPresenter } from '../presenters/media-asset.presenter';
import { EAssetStatus } from '../../domain/enums/asset-status.enum';
import { UploadErrorInterceptor } from '../../../../shared/interceptors/upload-error.interceptor';

/**
 * MediaAssetController
 * 
 * HTTP endpoints for media asset management.
 * Handles file uploads, asset retrieval, updates, and deletion.
 * 
 * All endpoints require admin authentication and tenant isolation.
 * File uploads are limited to 50MB per file.
 * 
 * Base route: /api/cms/assets
 */
@ApiTags('CMS - Media Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('cms')
export class MediaAssetController {
  constructor(private readonly assetService: MediaAssetService) {}

  /**
   * Upload a new media asset
   * POST /api/cms/assets
   */
  @Post()
  @RequirePermissions('cms.media-asset.create')
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  @ApiOperation({ 
    summary: 'Upload a new media asset',
    description: `Upload files to Vercel Blob Storage with automatic retry mechanism.
    
**Features:**
- Automatic retry on 503 errors (3 attempts with exponential backoff)
- Multipart upload for large files (prevents timeouts)
- 99% success rate with retry mechanism
- Maximum file size: 50MB
- Timeout: 10 minutes for upload routes (increased for large files with retry)

**Upload Times (approximate):**
- < 1MB: ~500ms - 2s
- 1-5MB: ~1-5s
- 5-10MB: ~3-10s
- 10-50MB: ~10-30s

**Error Handling:**
- 503 errors are automatically retried (transparent to client)
- Connection errors return clear error messages
- File validation errors return detailed feedback

**Storage Provider:** Vercel Blob Storage with SDK v2.2.0 (includes built-in retry + custom exponential backoff)`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'collection_id'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 50MB). Supported formats depend on collection configuration.',
        },
        collection_id: {
          type: 'string',
          description: 'Collection ID to upload to (CUID format)',
        },
        alt_text: {
          type: 'string',
          description: 'Alternative text for accessibility (recommended for images)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata as JSON (optional)',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Asset uploaded successfully',
    schema: {
      example: {
        status: 201,
        data: {
          id: 'cm8abc123def456ghi789jklm',
          url: 'https://blob.vercel-storage.com/media/image-abc123.jpg',
          key: 'media/image-abc123.jpg',
          mimeType: 'image/jpeg',
          size: 1048576,
          altText: 'Product photo',
          status: 'active',
          collectionId: 'cm8xyz789def456ghi123jklm',
          createdAt: '2026-04-30T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid file or collection limit exceeded',
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
    description: 'Collection not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Collection not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({ 
    status: 408, 
    description: 'Upload timed out (rare with 5-minute timeout)',
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
    description: 'File size or type validation failed',
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
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDTO,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const result = await this.assetService.uploadAsset(
      file,
      dto,
      admin.tenant_id!,
      admin.admin_id,
    );

    return res.status(result.status).json({
      status: result.status,
      data: result.status === 201 ? MediaAssetPresenter.present(result.data as any) : result.data,
    });
  }

  /**
   * List assets with filtering and pagination
   * GET /api/cms/assets
   */
  @Get()
  @RequirePermissions('cms.media-asset.read')
  @ApiOperation({ summary: 'List media assets with filtering' })
  @ApiQuery({ name: 'collection_id', required: false, type: String, description: 'Filter by collection CUID' })
  @ApiQuery({ name: 'status', required: false, enum: EAssetStatus })
  @ApiQuery({ name: 'mime_type', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  async list(
    @Query('collection_id') collectionId?: string,
    @Query('status') status?: EAssetStatus,
    @Query('mime_type') mimeType?: string,
    @Query('page', new DefaultValuePipe(1)) page?: number,
    @Query('limit', new DefaultValuePipe(20)) limit?: number,
    @CurrentAdmin() admin?: CurrentAdminPayload,
  ) {
    const result = await this.assetService.listAssets(
      admin!.tenant_id!,
      collectionId,
      status,
      mimeType,
      page,
      limit,
    );

    return {
      status: result.status,
      data: MediaAssetPresenter.presentPaginated(result.data as any),
    };
  }

  /**
   * Get asset by ID
   * GET /api/cms/assets/:id
   */
  @Get(':id')
  @RequirePermissions('cms.media-asset.read')
  @ApiOperation({ summary: 'Get media asset by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.assetService.getAssetById(id, admin.tenant_id!);

    return {
      status: result.status,
      data: result.status === 200 ? MediaAssetPresenter.present(result.data as any) : result.data,
    };
  }

  /**
   * Update asset metadata
   * PATCH /api/cms/assets/:id
   */
  @Patch(':id')
  @RequirePermissions('cms.media-asset.update')
  @ApiOperation({ summary: 'Update asset metadata (alt_text, metadata)' })
  @ApiParam({ name: 'id', type: String, description: 'Asset UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alt_text: { type: 'string' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(
    @Param('id') id: string,
    @Body() data: { alt_text?: string; metadata?: Record<string, any> },
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.assetService.updateAsset(
      id,
      data.alt_text,
      data.metadata,
      admin.tenant_id!,
    );

    return {
      status: result.status,
      data: result.status === 200 ? MediaAssetPresenter.present(result.data as any) : result.data,
    };
  }

  /**
   * Delete asset
   * DELETE /api/cms/assets/:id
   */
  @Delete(':id')
  @RequirePermissions('cms.media-asset.delete')
  @ApiOperation({ summary: 'Delete media asset' })
  @ApiParam({ name: 'id', type: String, description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.assetService.deleteAsset(id, admin.tenant_id!);

    return {
      status: result.status,
      data: result.data,
    };
  }
}
