import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Thrown when an author cannot be found by ID.
 * Used during article creation/update when validating author references.
 */
export class AuthorNotFoundError extends DomainException {
  constructor(authorId: number) {
    super(
      `Author with ID ${authorId} not found`,
      'AUTHOR_NOT_FOUND',
      { authorId },
    );
    this.name = 'AuthorNotFoundError';
  }
}
