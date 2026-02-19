import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_COLLECTION_REPOSITORY,
  IMediaCollectionRepository,
} from '../../domain/interfaces/media-collection.repository.interface';
import { 
  IPaginatedResult,
  MEDIA_ASSET_REPOSITORY,
  IMediaAssetRepository,
} from '../../domain/interfaces/media-asset.repository.interface';
import { MediaCollection } from '../../domain/entities/media-collection.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { ECollectionType } from '../../domain/enums/collection-type.enum';
import { CreateCollectionDTO } from '../dtos/create-collection.dto';
import { successResponse, errorResponse } from '../../../../shared/helpers/response.helper';
import { 
  ERROR_COLLECTION_SLUG_EXISTS,
  ERROR_COLLECTION_NOT_FOUND,
  ERROR_COLLECTION_NOT_EMPTY,
} from '../../domain/constants/error-constants';

/**
 * MediaCollectionService
 * 
 * Application service for managing media collections.
 * Handles business logic for creating, retrieving, updating, and deleting collections.
 * 
 * Follows NestJS DDD architecture:
 * - Injects repository via Symbol token (Dependency Inversion)
 * - Uses ServiceResponse pattern for error handling
 * - Delegates data access to repository layer
 * 
 * @Injectable decorator enables NestJS dependency injection
 */
@Injectable()
export class MediaCollectionService {
  constructor(
    @Inject(MEDIA_COLLECTION_REPOSITORY)
    private readonly collectionRepo: IMediaCollectionRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly assetRepo: IMediaAssetRepository,
  ) {}

  /**
   * Creates a new media collection
   * 
   * @param dto - Collection creation data
   * @param tenantId - Tenant identifier for isolation
   * @returns ServiceResponse with created collection or error
   * 
   * Validates:
   * - Slug uniqueness per tenant (Requirement 2.1)
   * 
   * Business Rules:
   * - Each tenant can have only one collection with a given slug
   * - Slug is used in storage paths and URLs, must be unique
   */
  async createCollection(
    dto: CreateCollectionDTO,
    tenantId: number,
  ): Promise<{ status: number; data: MediaCollection | { code: string } }> {
    // Check if slug already exists for tenant (Requirement 2.1)
    const existing = await this.collectionRepo.findBySlug(dto.slug, tenantId);
    if (existing) {
      return errorResponse(ERROR_COLLECTION_SLUG_EXISTS, 409);
    }

    // Create MediaCollection entity with dto data + tenant_id (Requirement 7.6)
    const collection = new MediaCollection({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      type: dto.type,
      max_file_size: dto.max_file_size,
      allowed_mime_types: dto.allowed_mime_types,
      max_items: dto.max_items,
      tenant_id: tenantId,
    });

    // Save using repository
    const saved = await this.collectionRepo.create(collection);
    
    // Return success response with 201 status
    return successResponse(saved, 201);
  }

  // Additional service methods will be implemented in subsequent tasks (8.3-8.7)

  /**
   * Retrieves a specific media collection by ID
   *
   * @param id - Collection identifier
   * @param tenantId - Tenant identifier for isolation
   * @returns ServiceResponse with collection or error
   *
   * Enforces:
   * - Tenant isolation (Requirement 15.1)
   *
   * Business Rules:
   * - Returns 404 if collection not found or doesn't belong to tenant
   * - Tenant isolation is enforced by passing tenantId to repository
   */
  async getCollectionById(
    id: number,
    tenantId: number,
  ): Promise<{ status: number; data: MediaCollection | { code: string } }> {
    // Call repository with tenant isolation (Requirement 7.8, 15.1)
    const collection = await this.collectionRepo.findById(id, tenantId);
    
    // Return 404 if not found
    if (!collection) {
      return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);
    }

    // Return success response with collection
    return successResponse(collection, 200);
  }

    /**
     * Lists all media collections for a tenant with optional filtering
     *
     * @param tenantId - Tenant identifier for isolation
     * @param type - Optional filter by collection type (image, document, video, audio, mixed)
     * @param page - Page number for pagination (default: 1)
     * @param limit - Items per page (default: 20)
     * @returns ServiceResponse with paginated collection results
     *
     * Supports:
     * - Type filtering (Requirement 2.7)
     * - Pagination (Requirement 7.7)
     *
     * Business Rules:
     * - Returns only collections belonging to the specified tenant
     * - Results are paginated with total count and page metadata
     */
    async listCollections(
      tenantId: number,
      type?: ECollectionType,
      page: number = 1,
      limit: number = 20,
    ): Promise<{ status: number; data: IPaginatedResult<MediaCollection> }> {
      // Call repository with filter params (Requirement 7.7)
      const result = await this.collectionRepo.findAll({
        tenant_id: tenantId,
        type,
        page,
        limit,
      });

      // Return success response with paginated results
      return successResponse(result, 200);
    }

    /**
     * Lists all assets in a specific collection
     *
     * @param id - Collection identifier
     * @param tenantId - Tenant identifier for isolation
     * @param page - Page number for pagination (default: 1)
     * @param limit - Items per page (default: 20)
     * @returns ServiceResponse with paginated asset results
     *
     * Supports:
     * - Pagination (Requirement 7.9)
     *
     * Business Rules:
     * - Returns 404 if collection not found or doesn't belong to tenant
     * - Returns only assets belonging to the specified collection
     * - Results are paginated with total count and page metadata
     */
    async getCollectionAssets(
      id: number,
      tenantId: number,
      page: number = 1,
      limit: number = 20,
    ): Promise<{ status: number; data: IPaginatedResult<MediaAsset> | { code: string } }> {
      // First check if collection exists (Requirement 7.9)
      const collection = await this.collectionRepo.findById(id, tenantId);
      
      // Return 404 if not found
      if (!collection) {
        return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);
      }

      // Call asset repository with collection filter (Requirement 7.9)
      const result = await this.assetRepo.findAll({
        tenant_id: tenantId,
        collection_id: id,
        page,
        limit,
      });

      // Return success response with paginated assets
      return successResponse(result, 200);
    }

    /**
     * Updates an existing media collection
     *
     * @param id - Collection identifier
     * @param data - Partial collection data to update
     * @param tenantId - Tenant identifier for isolation
     * @returns ServiceResponse with updated collection or error
     *
     * Enforces:
     * - Tenant isolation (Requirement 15.1)
     *
     * Business Rules:
     * - Returns 404 if collection not found or doesn't belong to tenant
     * - Only updates provided fields (partial update)
     * - Tenant isolation is enforced by passing tenantId to repository methods
     */
    async updateCollection(
      id: number,
      data: Partial<MediaCollection>,
      tenantId: number,
    ): Promise<{ status: number; data: MediaCollection | { code: string } }> {
      // First check if collection exists (Requirement 7.10)
      const collection = await this.collectionRepo.findById(id, tenantId);
      
      // Return 404 if not found
      if (!collection) {
        return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);
      }

      // Call repository to update collection (Requirement 7.10)
      const updated = await this.collectionRepo.update(id, data, tenantId);

      // Return success response with updated collection
      return successResponse(updated, 200);
    }

    /**
     * Deletes a media collection
     *
     * @param id - Collection identifier
     * @param tenantId - Tenant identifier for isolation
     * @returns ServiceResponse with deletion confirmation or error
     *
     * Enforces:
     * - Tenant isolation (Requirement 15.1)
     * - Referential integrity (Requirement 2.8)
     *
     * Business Rules:
     * - Returns 404 if collection not found or doesn't belong to tenant
     * - Returns 400 if collection contains assets (cannot delete non-empty collection)
     * - Only empty collections can be deleted to prevent orphaned assets
     */
    async deleteCollection(
      id: number,
      tenantId: number,
    ): Promise<{ status: number; data: { deleted: boolean } | { code: string } }> {
      // First check if collection exists (Requirement 7.11)
      const collection = await this.collectionRepo.findById(id, tenantId);
      
      // Return 404 if not found
      if (!collection) {
        return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);
      }

      // Check if collection has assets (Requirement 2.8)
      const assetCount = await this.assetRepo.countByCollection(id, tenantId);
      
      // Return 400 if collection contains assets
      if (assetCount > 0) {
        return errorResponse(ERROR_COLLECTION_NOT_EMPTY, 400);
      }

      // Delete collection (Requirement 7.11)
      await this.collectionRepo.delete(id, tenantId);

      // Return success response with deletion confirmation
      return successResponse({ deleted: true }, 200);
    }

}
