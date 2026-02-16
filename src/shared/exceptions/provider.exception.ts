/**
 * Exception for external provider/service errors.
 * Use this for:
 * - External API failures
 * - Third-party service errors
 * - Integration errors (AWS, SMTP, etc.)
 */
export class ProviderException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProviderException';
    Error.captureStackTrace(this, this.constructor);
  }
}
