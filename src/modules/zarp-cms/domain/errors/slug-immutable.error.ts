import { DomainException } from '@/shared/exceptions/domain.exception';

/**
 * Thrown when attempting to change the slug of a published article.
 * Enforces URL stability for published content.
 */
export class SlugImmutableError extends DomainException {
  constructor(articleId: number) {
    super(
      `Cannot change slug for published article ${articleId}`,
      'SLUG_IMMUTABLE',
      { articleId },
    );
    this.name = 'SlugImmutableError';
  }
}
