import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
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
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
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
@Controller('relations')
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
export class MediaRelationController {
  constructor(private readonly relationService: MediaRelationService) {}

  /**
   * Attach asset to entity
   * POST /api/cms/relations/attach
   */
  @Post('attach')
  @Roles(EAdminRole.editor)
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
  @Roles(EAdminRole.editor)
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
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: "Get all assets attached to an entity" })
  @ApiParam({ name: 'entityType', type: String, description: 'Entity type (e.g., article, brand, company)' })
  @ApiParam({ name: 'entityId', type: String, description: 'Entity UUID' })
  @ApiQuery({ name: 'relation_type', required: false, type: String, description: 'Filter by relation type (e.g., featured, gallery)' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  async getEntityAssets(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('relation_type') relationType?: string,
    @CurrentAdmin() admin?: CurrentAdminPayload,
  ) {
    const result = await this.relationService.getEntityAssets(
      entityType,
      entityId,
      relationType,
      admin?.tenant_id,
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
  @Roles(EAdminRole.editor)
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
