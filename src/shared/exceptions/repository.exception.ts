/**
 * Exception for repository/data layer errors.
 * Use this for:
 * - Database errors
 * - Query failures
 * - Transaction errors
 * - Data integrity violations
 */
export class RepositoryException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryException';
    Error.captureStackTrace(this, this.constructor);
  }
}
