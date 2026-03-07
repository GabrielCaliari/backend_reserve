import { MediaAsset } from '../entities/media-asset.entity';
import { EAssetStatus } from '../enums/asset-status.enum';

export const MEDIA_ASSET_REPOSITORY = Symbol('MEDIA_ASSET_REPOSITORY');

export interface IFindAssetsParams {
  tenant_id: string;
  collection_id?: string; // UUID reference to MediaCollection
  status?: EAssetStatus;
  mime_type?: string;
  page?: number;
  limit?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * MediaAsset Repository Interface
 * 
 * Defines the contract for MediaAsset data access operations.
 * Implementations must provide Prisma-based or in-memory storage.
 * 
 * **Validates: Requirements 8.6, 9.1, 9.2, 9.3, 15.6**
 */
export interface IMediaAssetRepository {
  /**
   * Creates a new MediaAsset record
   * @param entity - The MediaAsset entity to create
   * @param tx - Optional transaction context
   * @returns The created MediaAsset with generated UUID
   */
  create(entity: MediaAsset, tx?: any): Promise<MediaAsset>;

  /**
   * Finds a MediaAsset by UUID and tenant
   * @param id - The asset UUID (12-character cuid)
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The MediaAsset or null if not found
   */
  findById(id: string, tenantId: string, tx?: any): Promise<MediaAsset | null>;

  /**
   * Finds all MediaAssets matching the filter criteria
   * @param params - Filter and pagination parameters
   * @param tx - Optional transaction context
   * @returns Paginated result with assets
   */
  findAll(params: IFindAssetsParams, tx?: any): Promise<IPaginatedResult<MediaAsset>>;

  /**
   * Updates a MediaAsset record
   * @param id - The asset UUID (12-character cuid)
   * @param data - Partial data to update
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The updated MediaAsset
   */
  update(id: string, data: Partial<MediaAsset>, tenantId: string, tx?: any): Promise<MediaAsset>;

  /**
   * Deletes a MediaAsset record (cascade deletes relations)
   * @param id - The asset UUID (12-character cuid)
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   */
  delete(id: string, tenantId: string, tx?: any): Promise<void>;

  /**
   * Counts assets in a collection
   * @param collectionId - The collection UUID (12-character cuid)
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The count of assets
   */
  countByCollection(collectionId: string, tenantId: string, tx?: any): Promise<number>;
}
