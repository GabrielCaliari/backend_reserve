/**
 * Interface for token validation strategy
 * Each bounded context can implement this to provide its own validation logic
 */
export interface ITokenValidator {
  validate(token: string, sessionId: number): Promise<{ valid: boolean; userId?: number }>;
}

export const ADMIN_TOKEN_VALIDATOR = Symbol('ADMIN_TOKEN_VALIDATOR');
export const USER_TOKEN_VALIDATOR = Symbol('USER_TOKEN_VALIDATOR');
