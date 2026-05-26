import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Slug Value Object
 * 
 * Represents a URL-safe slug with validation.
 * Slugs must contain only lowercase letters, numbers, and hyphens.
 * No consecutive hyphens or leading/trailing hyphens are allowed.
 */
export class Slug {
  private readonly value: string;

  constructor(slug: string) {
    if (!Slug.isValid(slug)) {
      throw new DomainException(`Invalid slug: ${slug}`);
    }
    this.value = slug.toLowerCase().trim();
  }

  /**
   * Validates if a string is a valid URL-safe slug
   * @param slug - The string to validate
   * @returns true if valid, false otherwise
   */
  static isValid(slug: string): boolean {
    // URL-safe: lowercase letters, numbers, hyphens only
    // No consecutive hyphens, no leading/trailing hyphens
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  /**
   * Creates a Slug from a plain text string by slugifying it
   * @param text - The text to convert to a slug
   * @returns A new Slug instance
   */
  static fromString(text: string): Slug {
    const slugified = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    return new Slug(slugified);
  }

  /**
   * Returns the string representation of the slug
   */
  toString(): string {
    return this.value;
  }

  /**
   * Checks equality with another Slug
   * @param other - The other Slug to compare
   * @returns true if equal, false otherwise
   */
  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
