import { MediaCollection } from '../../domain/entities/media-collection.entity';

/**
 * MediaCollection Presenter
 * 
 * Transforms MediaCollection domain entities into API response format.
 * Keeps controllers thin by handling response formatting logic.
 * 
 * **Validates: Requirements 7.6, 7.7, 7.8, 7.9, 7.10, 7.11**
 */
export class MediaCollectionPresenter {
  /**
   * Presents a single MediaCollection entity
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
   * Presents a list of MediaCollection entities
   */
  static presentList(collections: MediaCollection[]) {
    return collections.map((collection) => this.present(collection));
  }

  /**
   * Presents a paginated result of MediaCollection entities
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
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
