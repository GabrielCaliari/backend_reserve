import { EArticleStatus } from '../enums/article-status.enum';

/**
 * Article Entity
 * 
 * Represents a blog article with SEO metadata, cover image, and author attribution.
 * Articles are scoped to a blog (identified by UUID) and track creation/edit history.
 */
export class Article {
  public static readonly DEFAULT_LANGUAGE = 'en_us';
  public static readonly LANGUAGE_PATTERN = /^[a-z]{2}_[a-z]{2}$/;

  public readonly id?: string; // UUID (12-character cuid)
  public displayTitle: string;
  public language: string;
  public metaTitle: string;
  public metaDescription: string | null;
  public focusKeyword: string | null;
  public content: string;
  public slug: string;
  public status: EArticleStatus;
  public publishedAt: Date | null;
  public coverImageId: string | null; // UUID reference to MediaAsset
  public authorId: string; // UUID reference to Author
  public blogId: string; // UUID reference to Blog
  public createdBy: string; // UUID reference to Admin
  public lastEditedBy: string | null; // UUID reference to Admin
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: string;
    displayTitle: string;
    language?: string;
    metaTitle: string;
    metaDescription?: string | null;
    focusKeyword?: string | null;
    content: string;
    slug: string;
    status?: EArticleStatus;
    publishedAt?: Date | null;
    coverImageId?: string | null;
    authorId: string;
    blogId: string;
    createdBy: string;
    lastEditedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.displayTitle = data.displayTitle;
    this.language = Article.normalizeLanguage(data.language);
    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription ?? null;
    this.focusKeyword = data.focusKeyword ?? null;
    this.content = data.content;
    this.slug = data.slug;
    this.status = data.status ?? EArticleStatus.draft;
    this.publishedAt = data.publishedAt ?? null;
    this.coverImageId = data.coverImageId ?? null;
    this.authorId = data.authorId;
    this.blogId = data.blogId;
    this.createdBy = data.createdBy;
    this.lastEditedBy = data.lastEditedBy ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static normalizeLanguage(language?: string | null): string {
    const normalized = (language ?? Article.DEFAULT_LANGUAGE).trim().toLowerCase();

    if (!Article.LANGUAGE_PATTERN.test(normalized)) {
      throw new Error('Article language must follow ll_cc format, for example en_us or pt_br');
    }

    return normalized;
  }

  /**
   * Checks if the article has all required fields to be published
   * @returns true if all required fields are present, false otherwise
   */
  canPublish(): boolean {
    return (
      this.displayTitle.length > 0 &&
      this.metaTitle.length > 0 &&
      this.coverImageId !== null &&
      this.authorId.length > 0 &&
      this.content.length > 0
    );
  }

  /**
   * Publishes the article if all required fields are present
   * @throws ArticleValidationError if required fields are missing
   */
  publish(): void {
    if (!this.canPublish()) {
      const missingFields: string[] = [];
      if (this.displayTitle.length === 0) missingFields.push('displayTitle');
      if (this.metaTitle.length === 0) missingFields.push('metaTitle');
      if (this.coverImageId === null) missingFields.push('coverImageId');
      if (this.authorId.length === 0) missingFields.push('authorId');
      if (this.content.length === 0) missingFields.push('content');

      throw new Error(
        `Article cannot be published: missing required fields - ${missingFields.join(', ')}`
      );
    }
    this.status = EArticleStatus.published;
    this.publishedAt = new Date();
  }

  /**
   * Validates SEO metadata length constraints
   * @returns Object with validation result and any error messages
   */
  validateMetadata(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.metaTitle.length > 60) {
      errors.push('meta_title exceeds 60 characters');
    }
    
    if (this.metaDescription && this.metaDescription.length > 160) {
      errors.push('meta_description exceeds 160 characters');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
