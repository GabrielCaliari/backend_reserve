import { Article } from '../../domain/entities/article.entity';
import { Author } from '../../domain/entities/author.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';

/**
 * ArticlePresenter
 * 
 * Formats Article entities for API responses with nested related data.
 * Transforms domain entities into clean, consistent JSON responses.
 * 
 * Responsibilities:
 * - Format single article responses with nested author, cover image, creator, and editor
 * - Format article list responses
 * - Handle null/optional fields appropriately
 * - Provide consistent response structure
 * 
 * Pattern: Static methods for stateless transformation
 * 
 * **Validates: All article-related requirements**
 */
export class ArticlePresenter {
  /**
   * Formats a single Article entity for API response
   * 
   * @param article - Domain entity to format
   * @param options - Optional nested data (author, coverImage, creator, lastEditor)
   * @returns Formatted response object
   */
  static present(
    article: Article,
    options?: {
      author?: Author;
      coverImage?: MediaAsset;
      creator?: { id: number; name: string; email: string };
      lastEditor?: { id: number; name: string; email: string };
    },
  ) {
    return {
      id: article.id, // string (UUID)
      display_title: article.displayTitle,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      focus_keyword: article.focusKeyword,
      content: article.content,
      slug: article.slug,
      status: article.status,
      display_order: article.displayOrder,
      published_at: article.publishedAt,
      cover_image_id: article.coverImageId, // string (UUID) | null
      author_id: article.authorId, // string (UUID)
      blog_id: article.blogId, // string (UUID)
      created_by: article.createdBy, // number (admin user ID)
      last_edited_by: article.lastEditedBy, // number (admin user ID) | null
      created_at: article.createdAt,
      updated_at: article.updatedAt,
      // Nested author information
      author: options?.author
        ? {
            id: options.author.id, // string (UUID)
            first_name: options.author.firstName,
            last_name: options.author.lastName,
            full_name: options.author.getFullName(),
            biography: options.author.biography,
            avatar_id: options.author.avatarId, // string (UUID) | null
            active: options.author.active,
          }
        : undefined,
      // Nested cover image information
      cover_image: options?.coverImage
        ? {
            id: options.coverImage.id, // string (UUID)
            url: options.coverImage.url,
            storage_key: options.coverImage.storage_key,
            filename: options.coverImage.filename,
            mime_type: options.coverImage.mime_type,
            file_size: options.coverImage.file_size,
            width: options.coverImage.width,
            height: options.coverImage.height,
            alt_text: options.coverImage.alt_text,
          }
        : undefined,
      // Nested creator information
      creator: options?.creator
        ? {
            id: options.creator.id, // number (admin user ID)
            name: options.creator.name,
            email: options.creator.email,
          }
        : undefined,
      // Nested last editor information
      last_editor: options?.lastEditor
        ? {
            id: options.lastEditor.id, // number (admin user ID)
            name: options.lastEditor.name,
            email: options.lastEditor.email,
          }
        : undefined,
    };
  }

  /**
   * Formats an array of Article entities for API response
   * 
   * @param articles - Array of domain entities to format
   * @param options - Optional map of nested data by article ID (string UUID keys)
   * @returns Array of formatted response objects
   */
  static presentList(
    articles: Article[],
    options?: {
      authors?: Map<string, Author>;
      coverImages?: Map<string, MediaAsset>;
      creators?: Map<number, { id: number; name: string; email: string }>;
      lastEditors?: Map<number, { id: number; name: string; email: string }>;
    },
  ) {
    return articles.map((article) =>
      this.present(article, {
        author: options?.authors?.get(article.authorId),
        coverImage: article.coverImageId
          ? options?.coverImages?.get(article.coverImageId)
          : undefined,
        creator: options?.creators?.get(article.createdBy),
        lastEditor: article.lastEditedBy
          ? options?.lastEditors?.get(article.lastEditedBy)
          : undefined,
      }),
    );
  }

  /**
   * Formats a paginated result with articles
   * 
   * @param result - Paginated result with articles
   * @param options - Optional map of nested data by article ID (string UUID keys for authors/coverImages, number keys for creators/lastEditors)
   * @returns Formatted paginated response
   */
  static presentPaginated(
    result: {
      data: Article[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
    options?: {
      authors?: Map<string, Author>;
      coverImages?: Map<string, MediaAsset>;
      creators?: Map<number, { id: number; name: string; email: string }>;
      lastEditors?: Map<number, { id: number; name: string; email: string }>;
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
