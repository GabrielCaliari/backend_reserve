import { MediaCollection } from '../entities/media-collection.entity';
import { ECollectionType } from '../enums/collection-type.enum';
import { IPaginatedResult } from './media-asset.repository.interface';

export const MEDIA_COLLECTION_REPOSITORY = Symbol('MEDIA_COLLECTION_REPOSITORY');

export interface IFindCollectionsParams {
  tenant_id: number;
  type?: ECollectionType;
  page?: number;
  limit?: number;
}

/**
 * MediaCollection Repository Interface
 * 
 * Defines the contract for MediaCollection data access operations.
 * Implementations must provide Prisma-based or in-memory storage.
 * 
 * **Validates: Requirements 8.6, 9.1, 9.2, 9.3**
 */
export interface IMediaCollectionRepository {
  /**
   * Creates a new MediaCollection record
   * @param entity - The MediaCollection entity to create
   * @param tx - Optional transaction context
   * @returns The created MediaCollection with generated ID
   */
  create(entity: MediaCollection, tx?: any): Promise<MediaCollection>;

  /**
   * Finds a MediaCollection by ID and tenant
   * @param id - The collection ID (UUID string)
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The MediaCollection or null if not found
   */
  findById(id: string, tenantId: number, tx?: any): Promise<MediaCollection | null>;

  /**
   * Finds a MediaCollection by slug and tenant
   * @param slug - The collection slug
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The MediaCollection or null if not found
   */
  findBySlug(slug: string, tenantId: number, tx?: any): Promise<MediaCollection | null>;

  /**
   * Finds all MediaCollections matching the filter criteria
   * @param params - Filter and pagination parameters
   * @param tx - Optional transaction context
   * @returns Paginated result with collections
   */
  findAll(params: IFindCollectionsParams, tx?: any): Promise<IPaginatedResult<MediaCollection>>;

  /**
   * Updates a MediaCollection record
   * @param id - The collection ID (UUID string)
   * @param data - Partial data to update
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   * @returns The updated MediaCollection
   */
  update(id: string, data: Partial<MediaCollection>, tenantId: number, tx?: any): Promise<MediaCollection>;

  /**
   * Deletes a MediaCollection record
   * @param id - The collection ID (UUID string)
   * @param tenantId - The tenant ID for isolation
   * @param tx - Optional transaction context
   */
  delete(id: string, tenantId: number, tx?: any): Promise<void>;
}
