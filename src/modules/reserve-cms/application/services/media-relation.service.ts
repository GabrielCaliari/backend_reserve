import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_RELATION_REPOSITORY,
  IMediaRelationRepository,
} from '../../domain/interfaces/media-relation.repository.interface';
import {
  MEDIA_ASSET_REPOSITORY,
  IMediaAssetRepository,
} from '../../domain/interfaces/media-asset.repository.interface';
import { MediaAssetRelation } from '../../domain/entities/media-asset-relation.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { AttachMediaDTO } from '../dtos/attach-media.dto';
import { DetachMediaDTO } from '../dtos/detach-media.dto';
import { ReorderMediaDTO } from '../dtos/reorder-media.dto';
import { successResponse, errorResponse } from '../../../../shared/helpers/response.helper';
import {
  ERROR_ASSET_NOT_FOUND,
  ERROR_RELATION_ALREADY_EXISTS,
} from '../../domain/constants/error-constants';

/**
 * MediaRelationService
 * 
 * Application service for managing polymorphic media asset relations.
 * Handles business logic for attaching, detaching, and querying assets
 * associated with any entity type (articles, brands, companies, users, etc.).
 * 
 * Follows NestJS DDD architecture:
 * - Injects repositories via Symbol tokens (Dependency Inversion)
 * - Uses ServiceResponse pattern for error handling
 * - Delegates data access to repository layer
 * - Enables polymorphic relations without code changes
 * 
 * @Injectable decorator enables NestJS dependency injection
 */
@Injectable()
export class MediaRelationService {
  constructor(
    @Inject(MEDIA_RELATION_REPOSITORY)
    private readonly relationRepo: IMediaRelationRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly assetRepo: IMediaAssetRepository,
  ) {}

  /**
   * Attaches a media asset to an entity with polymorphic relation
   * 
   * @param dto - Attachment data (asset_id, entity_type, entity_id, relation_type, etc.)
   * @param tenantId - Tenant identifier for isolation
   * @returns ServiceResponse with created relation or error
   * 
   * Validates:
   * - Asset exists and belongs to tenant (Requirement 3.1)
   * - Relation uniqueness (Requirement 3.2)
   * 
   * Business Rules:
   * - Auto-assigns display_order if not provided (Requirement 3.4)
   * - Entity types and relation types are converted to lowercase (Requirement 3.3)
   * - Enables polymorphic relations without code changes (Requirement 3.9, 3.10)
   */
  async attachAsset(
    dto: AttachMediaDTO,
    tenantId: string,
  ): Promise<{ status: number; data: MediaAssetRelation | { code: string } }> {
    // Validate asset exists and belongs to tenant (Requirement 3.1)
    const asset = await this.assetRepo.findById(dto.asset_id, tenantId);
    if (!asset) {
      return errorResponse(ERROR_ASSET_NOT_FOUND, 404);
    }

    // Check if relation already exists (Requirement 3.2)
    const exists = await this.relationRepo.exists(
      dto.asset_id,
      dto.entity_type,
      dto.entity_id,
      dto.relation_type,
    );
    if (exists) {
      return errorResponse(ERROR_RELATION_ALREADY_EXISTS, 409);
    }

    // Get current max display_order for this entity (Requirement 3.4)
    const existingRelations = await this.relationRepo.findByEntity(
      dto.entity_type,
      dto.entity_id,
      dto.relation_type,
    );
    const maxOrder = existingRelations.reduce(
      (max, rel) => Math.max(max, rel.display_order || 0),
      0,
    );

    // Create relation entity (entity_type and relation_type converted to lowercase in entity constructor)
    const relation = new MediaAssetRelation({
      asset_id: dto.asset_id,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      entity_id_type: dto.entity_id_type,
      relation_type: dto.relation_type,
      display_order: dto.display_order ?? maxOrder + 1,
      metadata: dto.metadata,
    });

    const saved = await this.relationRepo.create(relation);
    return successResponse(saved, 201);
  }

  /**
   * Detaches a media asset from an entity
   * 
   * @param dto - Detachment data (asset_id, entity_type, entity_id, relation_type)
   * @returns ServiceResponse with deletion confirmation
   * 
   * Business Rules:
   * - Removes the specific relation between asset and entity (Requirement 3.5)
   * - Does not delete the asset itself, only the relation
   */
  async detachAsset(
    dto: DetachMediaDTO,
  ): Promise<{ status: number; data: { detached: boolean } }> {
    await this.relationRepo.delete(
      dto.asset_id,
      dto.entity_type,
      dto.entity_id,
      dto.relation_type,
    );
    return successResponse({ detached: true }, 200);
  }

  /**
   * Retrieves all assets attached to a specific entity
   * 
   * @param entityType - Entity type (e.g., 'article', 'brand', 'company')
   * @param entityId - Entity identifier (UUID string or integer as string)
   * @param relationType - Optional filter by relation type (e.g., 'featured', 'gallery')
   * @returns ServiceResponse with sorted asset array
   * 
   * Business Rules:
   * - Returns assets sorted by display_order (Requirement 3.7)
   * - Supports optional relation_type filtering
   * - Fetches full asset details with metadata
   */
  async getEntityAssets(
    entityType: string,
    entityId: string,
    relationType?: string,
    tenantId?: string,
  ): Promise<{ status: number; data: MediaAsset[] }> {
    const relations = await this.relationRepo.findByEntity(
      entityType,
      entityId,
      relationType,
    );

    if (relations.length === 0) {
      return successResponse([], 200);
    }

    // Fetch full asset details
    const assetIds = relations.map((r) => r.asset_id);
    const assets = await Promise.all(
      assetIds.map((id) =>
        this.assetRepo.findById(id, tenantId || ''),
      ),
    );

    // Sort by display_order (Requirement 3.7)
    const sortedAssets = assets
      .filter((a) => a !== null)
      .sort((a, b) => {
        const relA = relations.find((r) => r.asset_id === a!.id);
        const relB = relations.find((r) => r.asset_id === b!.id);
        return (relA?.display_order || 0) - (relB?.display_order || 0);
      });

    return successResponse(sortedAssets as MediaAsset[], 200);
  }

  /**
   * Helper method to get the featured image for an entity
   * 
   * @param entityType - Entity type (e.g., 'article', 'brand')
   * @param entityId - Entity identifier (UUID string or integer as string)
   * @param relationType - Relation type (default: 'featured')
   * @returns ServiceResponse with first asset or null
   * 
   * Business Rules:
   * - Returns the first asset with the specified relation_type (Requirement 16.9)
   * - Commonly used for featured images, logos, avatars
   * - Returns null if no asset found
   */
  async getEntityFeaturedImage(
    entityType: string,
    entityId: string,
    relationType: string = 'featured',
  ): Promise<{ status: number; data: MediaAsset | null }> {
    const result = await this.getEntityAssets(entityType, entityId, relationType);
    if (result.status !== 200) {
      return { status: result.status, data: null };
    }

    const assets = result.data as MediaAsset[];
    return successResponse(assets[0] || null, 200);
  }

  /**
   * Reorders assets for an entity by updating display_order values
   * 
   * @param dto - Reorder data with array of { relation_id, display_order }
   * @returns ServiceResponse with reorder confirmation
   * 
   * Business Rules:
   * - Updates display_order atomically for multiple relations (Requirement 3.8)
   * - Typically used for drag-and-drop reordering in UI
   * - All updates happen in a single transaction
   */
  async reorderAssets(
    dto: ReorderMediaDTO,
  ): Promise<{ status: number; data: { reordered: boolean } }> {
    const updates = dto.items.map((item, index) => ({
      id: item.relation_id,
      display_order: index + 1,
    }));

    await this.relationRepo.updateOrder(updates);
    return successResponse({ reordered: true }, 200);
  }
}
