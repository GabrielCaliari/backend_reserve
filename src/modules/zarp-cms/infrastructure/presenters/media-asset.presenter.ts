import { MediaAsset } from '../../domain/entities/media-asset.entity';

/**
 * MediaAssetPresenter
 * 
 * Formats MediaAsset entities for API responses.
 * Transforms domain entities into clean, consistent JSON responses.
 * 
 * Responsibilities:
 * - Format single asset responses
 * - Format asset list responses
 * - Exclude internal/sensitive fields if needed
 * - Provide consistent response structure
 * 
 * Pattern: Static methods for stateless transformation
 */
export class MediaAssetPresenter {
  /**
   * Formats a single MediaAsset entity for API response
   * 
   * @param asset - Domain entity to format
   * @returns Formatted response object
   */
  static present(asset: MediaAsset) {
    return {
      id: asset.id,
      url: asset.url,
      storage_key: asset.storage_key,
      filename: asset.filename,
      mime_type: asset.mime_type,
      file_size: asset.file_size,
      width: asset.width,
      height: asset.height,
      alt_text: asset.alt_text,
      metadata: asset.metadata,
      status: asset.status,
      collection_id: asset.collection_id,
      tenant_id: asset.tenant_id,
      created_by: asset.created_by,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
    };
  }

  /**
   * Formats an array of MediaAsset entities for API response
   * 
   * @param assets - Array of domain entities to format
   * @returns Array of formatted response objects
   */
  static presentList(assets: MediaAsset[]) {
    return assets.map((asset) => this.present(asset));
  }

  /**
   * Formats a paginated result with assets
   * 
   * @param result - Paginated result with assets
   * @returns Formatted paginated response
   */
  static presentPaginated(result: {
    data: MediaAsset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }) {
    return {
      data: this.presentList(result.data),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
