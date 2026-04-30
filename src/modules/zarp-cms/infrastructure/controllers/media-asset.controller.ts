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
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';
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
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
export class MediaAssetController {
  constructor(private readonly assetService: MediaAssetService) {}

  /**
   * Upload a new media asset
   * POST /api/cms/assets
   */
  @Post()
  @Roles(EAdminRole.editor)
  @UseInterceptors(
    UploadErrorInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  @ApiOperation({ summary: 'Upload a new media asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'collection_id'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 50MB)',
        },
        collection_id: {
          type: 'string',
          description: 'Collection ID to upload to (CUID)',
        },
        alt_text: {
          type: 'string',
          description: 'Alternative text for accessibility',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata as JSON',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Asset uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or collection limit exceeded' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 422, description: 'File size or type validation failed' })
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
  @Roles(EAdminRole.viewer)
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
  @Roles(EAdminRole.viewer)
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
  @Roles(EAdminRole.editor)
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
  @Roles(EAdminRole.editor)
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
