import { Injectable } from '@nestjs/common';
import { ITokenValidator } from '../../../../shared/auth/interfaces/token-validator.interface';
import AdminSessionTokenRepository from '../repositories/admin-session-token.repository';

/**
 * Admin Token Validator
 * Implements ITokenValidator for admin JWT token validation.
 * Delegates to AdminSessionTokenRepository for session lookup, hash comparison, and JWT verification.
 */
@Injectable()
export class AdminTokenValidator implements ITokenValidator {
  constructor(
    private readonly adminSessionTokenRepository: AdminSessionTokenRepository,
  ) {}

  async validate(token: string, sessionId: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const result = await this.adminSessionTokenRepository.validateToken(sessionId, token);

      if (result === false) {
        return { valid: false };
      }

      return { valid: true, userId: result.admin_id };
    } catch {
      return { valid: false };
    }
  }
}
