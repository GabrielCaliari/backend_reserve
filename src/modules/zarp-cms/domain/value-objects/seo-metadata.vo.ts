import { DomainException } from '@/shared/exceptions/domain.exception';

/**
 * SEO Metadata Value Object
 * 
 * Encapsulates SEO-related metadata with validation constraints.
 * - metaTitle: max 60 characters (optimal for search engine display)
 * - metaDescription: max 160 characters (optimal for search engine snippets)
 * - focusKeyword: optional keyword for SEO targeting
 */
export class SeoMetadata {
  private readonly metaTitle: string;
  private readonly metaDescription: string | null;
  private readonly focusKeyword: string | null;

  constructor(data: {
    metaTitle: string;
    metaDescription?: string | null;
    focusKeyword?: string | null;
  }) {
    if (data.metaTitle.length > 60) {
      throw new DomainException('meta_title cannot exceed 60 characters');
    }
    
    if (data.metaDescription && data.metaDescription.length > 160) {
      throw new DomainException('meta_description cannot exceed 160 characters');
    }

    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription ?? null;
    this.focusKeyword = data.focusKeyword ?? null;
  }

  /**
   * Returns the meta title
   */
  getMetaTitle(): string {
    return this.metaTitle;
  }

  /**
   * Returns the meta description
   */
  getMetaDescription(): string | null {
    return this.metaDescription;
  }

  /**
   * Returns the focus keyword
   */
  getFocusKeyword(): string | null {
    return this.focusKeyword;
  }
}
