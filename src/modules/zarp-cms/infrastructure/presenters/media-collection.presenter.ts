import { MediaCollection } from '../../domain/entities/media-collection.entity';

/**
 * MediaCollectionPresenter
 * 
 * Formats MediaCollection entities for API responses.
 * Transforms domain entities into clean, consistent JSON responses.
 * 
 * Responsibilities:
 * - Format single collection responses
 * - Format collection list responses
 * - Provide consistent response structure
 * 
 * Pattern: Static methods for stateless transformation
 */
export class MediaCollectionPresenter {
  /**
   * Formats a single MediaCollection entity for API response
   * 
   * @param collection - Domain entity to format
   * @returns Formatted response object
   */
  static present(collection: MediaCollection) {
    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      type: collection.type,
      max_file_size: collection.max_file_size,
      allowed_mime_types: collection.allowed_mime_types,
      max_items: collection.max_items,
      tenant_id: collection.tenant_id,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    };
  }

  /**
   * Formats an array of MediaCollection entities for API response
   * 
   * @param collections - Array of domain entities to format
   * @returns Array of formatted response objects
   */
  static presentList(collections: MediaCollection[]) {
    return collections.map((collection) => this.present(collection));
  }

  /**
   * Formats a paginated result with collections
   * 
   * @param result - Paginated result with collections
   * @returns Formatted paginated response
   */
  static presentPaginated(result: {
    data: MediaCollection[];
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
