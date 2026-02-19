import { MediaAssetRelation } from '../entities/media-asset-relation.entity';

export const MEDIA_RELATION_REPOSITORY = Symbol('MEDIA_RELATION_REPOSITORY');

/**
 * MediaRelation Repository Interface
 * 
 * Defines the contract for MediaAssetRelation data access operations.
 * Implementations must provide Prisma-based or in-memory storage.
 * 
 * **Validates: Requirements 8.6, 9.1, 9.2, 9.3**
 */
export interface IMediaRelationRepository {
  /**
   * Creates a new MediaAssetRelation record
   * @param entity - The MediaAssetRelation entity to create
   * @param tx - Optional transaction context
   * @returns The created MediaAssetRelation with generated ID
   */
  create(entity: MediaAssetRelation, tx?: any): Promise<MediaAssetRelation>;

  /**
   * Finds all relations for a specific entity
   * @param entityType - The entity type (e.g., 'article', 'brand')
   * @param entityId - The entity ID
   * @param relationType - Optional relation type filter (e.g., 'featured', 'gallery')
   * @param tx - Optional transaction context
   * @returns Array of MediaAssetRelations ordered by display_order
   */
  findByEntity(
    entityType: string,
    entityId: number,
    relationType?: string,
    tx?: any,
  ): Promise<MediaAssetRelation[]>;

  /**
   * Finds all relations for a specific asset
   * @param assetId - The asset ID
   * @param tx - Optional transaction context
   * @returns Array of MediaAssetRelations
   */
  findByAsset(assetId: number, tx?: any): Promise<MediaAssetRelation[]>;

  /**
   * Deletes a specific relation
   * @param assetId - The asset ID
   * @param entityType - The entity type
   * @param entityId - The entity ID
   * @param relationType - The relation type
   * @param tx - Optional transaction context
   */
  delete(
    assetId: number,
    entityType: string,
    entityId: number,
    relationType: string,
    tx?: any,
  ): Promise<void>;

  /**
   * Deletes all relations for a specific asset (used during asset deletion)
   * @param assetId - The asset ID
   * @param tx - Optional transaction context
   */
  deleteByAsset(assetId: number, tx?: any): Promise<void>;

  /**
   * Updates display_order for multiple relations atomically
   * @param relations - Array of {id, display_order} pairs
   * @param tx - Optional transaction context
   */
  updateOrder(relations: Array<{ id: number; display_order: number }>, tx?: any): Promise<void>;

  /**
   * Checks if a relation already exists
   * @param assetId - The asset ID
   * @param entityType - The entity type
   * @param entityId - The entity ID
   * @param relationType - The relation type
   * @param tx - Optional transaction context
   * @returns true if relation exists, false otherwise
   */
  exists(
    assetId: number,
    entityType: string,
    entityId: number,
    relationType: string,
    tx?: any,
  ): Promise<boolean>;
}
