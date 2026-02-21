import { Injectable, Inject } from '@nestjs/common';
import sharp from 'sharp';
import { MEDIA_ASSET_REPOSITORY } from '../../domain/interfaces/media-asset.repository.interface';
import { IMediaAssetRepository } from '../../domain/interfaces/media-asset.repository.interface';
import { MEDIA_COLLECTION_REPOSITORY } from '../../domain/interfaces/media-collection.repository.interface';
import { IMediaCollectionRepository } from '../../domain/interfaces/media-collection.repository.interface';
import { STORAGE_PROVIDER } from '../../domain/interfaces/storage.interface';
import { IStorageProvider } from '../../domain/interfaces/storage.interface';
import { IMAGE_PROCESSOR } from '../../domain/interfaces/image-processor.interface';
import { IImageProcessor } from '../../domain/interfaces/image-processor.interface';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { EAssetStatus } from '../../domain/enums/asset-status.enum';
import { UploadMediaDTO } from '../dtos/upload-media.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers/response.helper';
import { isValidUUID } from '../../domain/utils/uuid.util';
import {
  ERROR_COLLECTION_NOT_FOUND,
  ERROR_FILE_SIZE_EXCEEDED,
  ERROR_INVALID_FILE_TYPE,
  ERROR_COLLECTION_LIMIT_EXCEEDED,
  ERROR_STORAGE_PROVIDER_ERROR,
  ERROR_ASSET_NOT_FOUND,
  ERROR_INVALID_UUID,
} from '../../domain/constants/error-constants';

/**
 * MediaAssetService
 * 
 * Application service for managing media assets.
 * Orchestrates domain entities, repositories, and external providers.
 * 
 * Responsibilities:
 * - Upload assets to collections with validation
 * - Process images to WebP format
 * - Manage asset lifecycle (create, read, update, delete)
 * - Enforce collection rules and tenant isolation
 * 
 * Validates Requirements: 9.8, 9.9
 */
@Injectable()
export class MediaAssetService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly assetRepo: IMediaAssetRepository,
    @Inject(MEDIA_COLLECTION_REPOSITORY)
    private readonly collectionRepo: IMediaCollectionRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: IImageProcessor,
  ) {}

  /**
   * Upload a media asset to a collection
   * 
   * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   * 
   * @param file - Uploaded file from multer
   * @param dto - Upload metadata (collection_id, alt_text, metadata)
   * @param tenantId - Tenant ID for isolation
   * @param userId - User ID who created the asset
   * @returns ServiceResponse with created MediaAsset or error
   */
  async uploadAsset(
    file: Express.Multer.File,
    dto: UploadMediaDTO,
    tenantId: number,
    userId: number,
  ) {
    try {
      // 0. Validate collection UUID format (Requirement 15.7)
      if (!isValidUUID(dto.collection_id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: collection_id`, 400);
      }

      // 1. Validate collection exists and belongs to tenant (Requirement 4.1)
      const collection = await this.collectionRepo.findById(dto.collection_id, tenantId);
      if (!collection) {
        return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);
      }

      // 2. Validate file size against collection rules (Requirement 4.2)
      if (!collection.validateFileSize(file.size)) {
        return errorResponse(ERROR_FILE_SIZE_EXCEEDED, 422);
      }

      // 3. Validate mime type against collection rules (Requirement 4.3)
      if (!collection.validateMimeType(file.mimetype)) {
        return errorResponse(ERROR_INVALID_FILE_TYPE, 422);
      }

      // 4. Check collection item limit (Requirement 4.4)
      const currentCount = await this.assetRepo.countByCollection(dto.collection_id, tenantId);
      if (!collection.canAddMoreItems(currentCount)) {
        return errorResponse(ERROR_COLLECTION_LIMIT_EXCEEDED, 400);
      }

      // 5. Process image if applicable (Requirement 4.5)
      let processedBuffer = file.buffer;
      let width: number | undefined;
      let height: number | undefined;
      let finalMimeType = file.mimetype;

      if (file.mimetype.startsWith('image/')) {
        // Get quality from environment variable (Requirement 4.6)
        const quality = parseInt(process.env.CMS_IMAGE_QUALITY || '80', 10);
        
        // Extract dimensions from original image before processing
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width;
        height = metadata.height;

        // Process to WebP format
        const processed = await this.imageProcessor.processToWebp(file.buffer, quality);
        processedBuffer = processed.data;
        finalMimeType = 'image/webp';
      }

      // 6. Generate unique storage key (Requirement 15.4)
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(file.originalname);
      const storageKey = `cms/${tenantId}/${collection.slug}/${timestamp}-${sanitizedFilename}`;

      // 7. Upload to storage provider (Requirement 1.1)
      const uploadResult = await this.storageProvider.upload(
        storageKey,
        processedBuffer,
        finalMimeType,
      );

      // 8. Create MediaAsset entity (Requirements 1.1, 1.2, 1.3, 1.4)
      const asset = new MediaAsset({
        url: uploadResult.url,
        storage_key: uploadResult.key,
        filename: file.originalname,
        mime_type: finalMimeType,
        file_size: processedBuffer.length,
        width,
        height,
        alt_text: dto.alt_text,
        metadata: dto.metadata,
        collection_id: dto.collection_id,
        tenant_id: tenantId,
        created_by: userId,
      });

      // 9. Save to database
      const saved = await this.assetRepo.create(asset);
      
      return successResponse(saved, 201);
    } catch (err) {
      // Handle storage provider errors
      return errorResponse(ERROR_STORAGE_PROVIDER_ERROR, 500, err);
    }
  }

  /**
   * Sanitize filename to prevent path traversal and special characters
   * 
   * Validates Requirements: 15.5
   * 
   * @param filename - Original filename
   * @returns Sanitized filename safe for storage
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace special chars with underscore
      .replace(/_{2,}/g, '_')            // Replace multiple underscores with single
      .toLowerCase();                     // Convert to lowercase
  }

  /**
   * List assets with filtering and pagination
   * 
   * Validates Requirements: 1.7, 7.2
   * 
   * @param tenantId - Tenant ID for isolation
   * @param collectionId - Optional filter by collection UUID
   * @param status - Optional filter by status
   * @param mimeType - Optional filter by mime type
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns ServiceResponse with paginated assets or error
   */
  async listAssets(
    tenantId: number,
    collectionId?: string,
    status?: EAssetStatus,
    mimeType?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const result = await this.assetRepo.findAll({
        tenant_id: tenantId,
        collection_id: collectionId,
        status,
        mime_type: mimeType,
        page,
        limit,
      });

      return successResponse(result, 200);
    } catch (err) {
      return errorResponse(ERROR_STORAGE_PROVIDER_ERROR, 500, err);
    }
  }

  /**
   * Get a single asset by UUID with tenant isolation
   * 
   * Validates Requirements: 7.3, 15.1
   * 
   * @param id - Asset UUID (12-character cuid)
   * @param tenantId - Tenant ID for isolation
   * @returns ServiceResponse with asset or error
   */
  async getAssetById(id: string, tenantId: number) {
    try {
      // Validate asset UUID format (Requirement 15.7)
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: asset_id`, 400);
      }

      const asset = await this.assetRepo.findById(id, tenantId);
      
      if (!asset) {
        return errorResponse(ERROR_ASSET_NOT_FOUND, 404);
      }

      return successResponse(asset, 200);
    } catch (err) {
      return errorResponse(ERROR_STORAGE_PROVIDER_ERROR, 500, err);
    }
  }

  /**
   * Update asset metadata (only alt_text and metadata fields)
   * 
   * Validates Requirements: 1.8, 7.4
   * 
   * @param id - Asset UUID (12-character cuid)
   * @param altText - Optional new alt text
   * @param metadata - Optional new metadata
   * @param tenantId - Tenant ID for isolation
   * @returns ServiceResponse with updated asset or error
   */
  async updateAsset(
    id: string,
    altText?: string,
    metadata?: Record<string, any>,
    tenantId?: number,
  ) {
    try {
      // Validate asset UUID format (Requirement 15.7)
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: asset_id`, 400);
      }

      // Verify asset exists and belongs to tenant
      const asset = await this.assetRepo.findById(id, tenantId);
      
      if (!asset) {
        return errorResponse(ERROR_ASSET_NOT_FOUND, 404);
      }

      // Only allow updating alt_text and metadata (Requirement 1.8)
      const updateData: Partial<MediaAsset> = {};
      
      if (altText !== undefined) {
        updateData.alt_text = altText;
      }
      
      if (metadata !== undefined) {
        updateData.metadata = metadata;
      }

      // Update in database
      const updated = await this.assetRepo.update(id, updateData, tenantId);

      return successResponse(updated, 200);
    } catch (err) {
      return errorResponse(ERROR_STORAGE_PROVIDER_ERROR, 500, err);
    }
  }

  /**
   * Delete asset from storage provider and database
   * 
   * Validates Requirements: 1.6, 7.5
   * 
   * @param id - Asset UUID (12-character cuid)
   * @param tenantId - Tenant ID for isolation
   * @returns ServiceResponse with deletion confirmation or error
   */
  async deleteAsset(id: string, tenantId: number) {
    try {
      // Validate asset UUID format (Requirement 15.7)
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: asset_id`, 400);
      }

      // Verify asset exists and belongs to tenant
      const asset = await this.assetRepo.findById(id, tenantId);
      
      if (!asset) {
        return errorResponse(ERROR_ASSET_NOT_FOUND, 404);
      }

      // Delete from storage provider first (Requirement 1.6)
      await this.storageProvider.delete(asset.storage_key);

      // Delete from database (cascade deletes relations - Requirement 3.6)
      await this.assetRepo.delete(id, tenantId);

      return successResponse({ deleted: true }, 200);
    } catch (err) {
      return errorResponse(ERROR_STORAGE_PROVIDER_ERROR, 500, err);
    }
  }
}
