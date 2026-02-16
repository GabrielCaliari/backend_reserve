/**
 * Base exception for domain-level errors.
 * Represents violations of business rules and invariants.
 * Use this for:
 * - Invalid state transitions
 * - Business rule violations
 * - Validation errors at the domain level
 */
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainException';
    Error.captureStackTrace(this, this.constructor);
  }
}
