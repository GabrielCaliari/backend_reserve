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
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { MediaCollectionService } from '../../application/services/media-collection.service';
import { MediaAssetService } from '../../application/services/media-asset.service';
import { CreateCollectionDTO } from '../../application/dtos/create-collection.dto';
import { MediaCollectionPresenter } from '../presenters/media-collection.presenter';
import { MediaAssetPresenter } from '../presenters/media-asset.presenter';
import { ECollectionType } from '../../domain/enums/collection-type.enum';

/**
 * MediaCollectionController
 * 
 * HTTP endpoints for media collection management.
 * Handles collection CRUD operations and asset listing per collection.
 * 
 * All endpoints require admin authentication and tenant isolation.
 * 
 * Base route: /api/cms/collections
 */
@ApiTags('CMS - Media Collections')
@ApiBearerAuth()
@Controller('collections')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('cms')
export class MediaCollectionController {
  constructor(
    private readonly collectionService: MediaCollectionService,
    private readonly assetService: MediaAssetService,
  ) {}

  /**
   * Create a new collection
   * POST /api/cms/collections
   */
  @Post()
  @RequirePermissions('cms.media-collection.create')
  @ApiOperation({ summary: 'Create a new media collection' })
  @ApiBody({ type: CreateCollectionDTO })
  @ApiResponse({ status: 201, description: 'Collection created successfully' })
  @ApiResponse({ status: 409, description: 'Collection slug already exists for tenant' })
  async create(
    @Body() dto: CreateCollectionDTO,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.createCollection(dto, admin.tenant_id!);

    return {
      status: result.status,
      data: result.status === 201 ? MediaCollectionPresenter.present(result.data as any) : result.data,
    };
  }

  /**
   * List collections with filtering
   * GET /api/cms/collections
   */
  @Get()
  @RequirePermissions('cms.media-collection.read')
  @ApiOperation({ summary: 'List media collections with filtering' })
  @ApiQuery({ name: 'type', required: false, enum: ECollectionType })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async list(
    @Query('type') type?: ECollectionType,
    @Query('page', new DefaultValuePipe(1)) page?: number,
    @Query('limit', new DefaultValuePipe(20)) limit?: number,
    @CurrentAdmin() admin?: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.listCollections(
      admin!.tenant_id!,
      type,
      page,
      limit,
    );

    return {
      status: result.status,
      data: MediaCollectionPresenter.presentPaginated(result.data as any),
    };
  }

  /**
   * Get collection by ID
   * GET /api/cms/collections/:id
   */
  @Get(':id')
  @RequirePermissions('cms.media-collection.read')
  @ApiOperation({ summary: 'Get media collection by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Collection ID (UUID)', example: 'abc123def456' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.getCollectionById(id, admin.tenant_id!);

    return {
      status: result.status,
      data: result.status === 200 ? MediaCollectionPresenter.present(result.data as any) : result.data,
    };
  }

  /**
   * Get assets in a collection
   * GET /api/cms/collections/:id/assets
   */
  @Get(':id/assets')
  @RequirePermissions('cms.media-collection.read')
  @ApiOperation({ summary: 'List all assets in a collection' })
  @ApiParam({ name: 'id', type: String, description: 'Collection ID (UUID)', example: 'abc123def456' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully, including delete action metadata per item' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getAssets(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1)) page?: number,
    @Query('limit', new DefaultValuePipe(20)) limit?: number,
    @CurrentAdmin() admin?: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.getCollectionAssets(
      id,
      admin!.tenant_id!,
      page,
      limit,
    );

    return {
      status: result.status,
      data: result.status === 200 ? MediaAssetPresenter.presentPaginated(result.data as any) : result.data,
    };
  }

  /**
   * Delete a specific asset from a collection
   * DELETE /api/cms/collections/:id/assets/:assetId
   */
  @Delete(':id/assets/:assetId')
  @RequirePermissions('cms.media-collection.update')
  @ApiOperation({ summary: 'Delete a specific asset from a collection' })
  @ApiParam({ name: 'id', type: String, description: 'Collection ID (UUID)', example: 'abc123def456' })
  @ApiParam({ name: 'assetId', type: String, description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully with deleted asset and collection identifiers' })
  @ApiResponse({ status: 404, description: 'Collection or asset not found' })
  async removeAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.assetService.deleteAssetFromCollection(
      id,
      assetId,
      admin.tenant_id!,
    );

    return {
      status: result.status,
      data: result.data,
    };
  }

  /**
   * Update collection
   * PUT /api/cms/collections/:id
   */
  @Put(':id')
  @RequirePermissions('cms.media-collection.update')
  @ApiOperation({ summary: 'Update media collection' })
  @ApiParam({ name: 'id', type: String, description: 'Collection ID (UUID)', example: 'abc123def456' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['image', 'document', 'video', 'audio', 'mixed'] },
        max_file_size: { type: 'number' },
        allowed_mime_types: { type: 'array', items: { type: 'string' } },
        max_items: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Collection updated successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.updateCollection(id, data, admin.tenant_id!);

    return {
      status: result.status,
      data: result.status === 200 ? MediaCollectionPresenter.present(result.data as any) : result.data,
    };
  }

  /**
   * Delete collection
   * DELETE /api/cms/collections/:id
   */
  @Delete(':id')
  @RequirePermissions('cms.media-collection.delete')
  @ApiOperation({ summary: 'Delete media collection (only if empty)' })
  @ApiParam({ name: 'id', type: String, description: 'Collection ID (UUID)', example: 'abc123def456' })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 400, description: 'Collection contains assets and cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.collectionService.deleteCollection(id, admin.tenant_id!);

    return {
      status: result.status,
      data: result.data,
    };
  }
}
