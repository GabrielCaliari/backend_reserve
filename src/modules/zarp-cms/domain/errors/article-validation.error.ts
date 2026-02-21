import { DomainException } from '@/shared/exceptions/domain.exception';

/**
 * Thrown when an article fails validation rules.
 * Used for publishing validation and field requirement checks.
 */
export class ArticleValidationError extends DomainException {
  constructor(
    message: string,
    public readonly missingFields?: string[],
  ) {
    super(message, 'ARTICLE_VALIDATION_ERROR', { missingFields });
    this.name = 'ArticleValidationError';
  }
}
