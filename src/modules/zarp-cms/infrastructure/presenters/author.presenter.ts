import { Author } from '../../domain/entities/author.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';

/**
 * AuthorPresenter
 * 
 * Formats Author entities for API responses with nested avatar data.
 * Transforms domain entities into clean, consistent JSON responses.
 * 
 * Responsibilities:
 * - Format single author responses with nested avatar information
 * - Format author list responses
 * - Format paginated author results
 * - Handle null/optional fields appropriately
 * - Provide consistent response structure
 * 
 * Pattern: Static methods for stateless transformation
 * 
 * **Validates: Requirements 5.1**
 */
export class AuthorPresenter {
  /**
   * Formats a single Author entity for API response
   * 
   * @param author - Domain entity to format
   * @param options - Optional nested data (avatar)
   * @returns Formatted response object
   */
  static present(
    author: Author,
    options?: {
      avatar?: MediaAsset;
    },
  ) {
    return {
      id: author.id,
      first_name: author.firstName,
      last_name: author.lastName,
      full_name: author.getFullName(),
      biography: author.biography,
      avatar_id: author.avatarId,
      tenant_id: author.tenantId,
      active: author.active,
      created_at: author.createdAt,
      updated_at: author.updatedAt,
      // Nested avatar information
      avatar: options?.avatar
        ? {
            id: options.avatar.id,
            url: options.avatar.url,
            storage_key: options.avatar.storage_key,
            filename: options.avatar.filename,
            mime_type: options.avatar.mime_type,
            file_size: options.avatar.file_size,
            width: options.avatar.width,
            height: options.avatar.height,
            alt_text: options.avatar.alt_text,
          }
        : undefined,
    };
  }

  /**
   * Formats an array of Author entities for API response
   * 
   * @param authors - Array of domain entities to format
   * @param options - Optional map of nested data by author ID
   * @returns Array of formatted response objects
   */
  static presentList(
    authors: Author[],
    options?: {
      avatars?: Map<string, MediaAsset>;
    },
  ) {
    return authors.map((author) =>
      this.present(author, {
        avatar: author.avatarId
          ? options?.avatars?.get(author.avatarId)
          : undefined,
      }),
    );
  }

  /**
   * Formats a paginated result with authors
   * 
   * @param result - Paginated result with authors
   * @param options - Optional map of nested data by author ID
   * @returns Formatted paginated response
   */
  static presentPaginated(
    result: {
      data: Author[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
    options?: {
      avatars?: Map<string, MediaAsset>;
    },
  ) {
    return {
      data: this.presentList(result.data, options),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
