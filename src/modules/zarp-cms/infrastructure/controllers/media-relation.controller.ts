import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { MediaRelationService } from '../../application/services/media-relation.service';
import { AttachMediaDTO } from '../../application/dtos/attach-media.dto';
import { DetachMediaDTO } from '../../application/dtos/detach-media.dto';
import { ReorderMediaDTO } from '../../application/dtos/reorder-media.dto';
import { MediaAssetPresenter } from '../presenters/media-asset.presenter';

/**
 * MediaRelationController
 * 
 * HTTP endpoints for managing polymorphic media asset relations.
 * Handles attaching/detaching assets to entities and reordering.
 * 
 * All endpoints require admin authentication and tenant isolation.
 * 
 * Base route: /api/cms/relations
 */
@ApiTags('CMS - Media Relations')
@ApiBearerAuth()
@Controller('cms/relations')
@UseGuards(AdminJwtGuard, TenantGuard)
export class MediaRelationController {
  constructor(private readonly relationService: MediaRelationService) {}

  /**
   * Attach asset to entity
   * POST /api/cms/relations/attach
   */
  @Post('attach')
  @ApiOperation({ summary: 'Attach a media asset to an entity' })
  @ApiBody({ type: AttachMediaDTO })
  @ApiResponse({ status: 201, description: 'Asset attached successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'Relation already exists' })
  async attach(
    @Body() dto: AttachMediaDTO,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    const result = await this.relationService.attachAsset(dto, admin.tenant_id!);

    return {
      status: result.status,
      data: result.data,
    };
  }

  /**
   * Detach asset from entity
   * POST /api/cms/relations/detach
   */
  @Post('detach')
  @ApiOperation({ summary: 'Detach a media asset from an entity' })
  @ApiBody({ type: DetachMediaDTO })
  @ApiResponse({ status: 200, description: 'Asset detached successfully' })
  async detach(@Body() dto: DetachMediaDTO) {
    const result = await this.relationService.detachAsset(dto);

    return {
      status: result.status,
      data: result.data,
    };
  }

  /**
   * Get entity's assets
   * GET /api/cms/relations/:entityType/:entityId
   */
  @Get(':entityType/:entityId')
  @ApiOperation({ summary: "Get all assets attached to an entity" })
  @ApiParam({ name: 'entityType', type: String, description: 'Entity type (e.g., article, brand, company)' })
  @ApiParam({ name: 'entityId', type: Number, description: 'Entity ID' })
  @ApiQuery({ name: 'relation_type', required: false, type: String, description: 'Filter by relation type (e.g., featured, gallery)' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  async getEntityAssets(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: number,
    @Query('relation_type') relationType?: string,
  ) {
    const result = await this.relationService.getEntityAssets(
      entityType,
      String(entityId),
      relationType,
    );

    return {
      status: result.status,
      data: result.status === 200 ? MediaAssetPresenter.presentList(result.data as any) : result.data,
    };
  }

  /**
   * Reorder entity's assets
   * PUT /api/cms/relations/reorder
   */
  @Put('reorder')
  @ApiOperation({ summary: 'Reorder assets for an entity' })
  @ApiBody({ type: ReorderMediaDTO })
  @ApiResponse({ status: 200, description: 'Assets reordered successfully' })
  async reorder(@Body() dto: ReorderMediaDTO) {
    const result = await this.relationService.reorderAssets(dto);

    return {
      status: result.status,
      data: result.data,
    };
  }
}
