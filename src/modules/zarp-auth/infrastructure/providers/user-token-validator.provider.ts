import { Injectable } from '@nestjs/common';
import { ITokenValidator } from '../../../../shared/auth/interfaces/token-validator.interface';
import UserSessionTokenRepository from '../repositories/user-session-token.repository';

/**
 * User Token Validator
 * Implements ITokenValidator for user JWT token validation.
 * Delegates to UserSessionTokenRepository for session lookup, hash comparison, and JWT verification.
 */
@Injectable()
export class UserTokenValidator implements ITokenValidator {
  constructor(
    private readonly userSessionTokenRepository: UserSessionTokenRepository,
  ) {}

  async validate(token: string, sessionId: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const result = await this.userSessionTokenRepository.validateToken(sessionId, token);

      if (result === false) {
        return { valid: false };
      }

      return { valid: true, userId: String(result.user_id) };
    } catch {
      return { valid: false };
    }
  }
}
