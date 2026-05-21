import { Injectable } from '@nestjs/common';
import { CustomerSessionTokenRepository } from '../repositories/customer-session-token.repository';

export const CUSTOMER_TOKEN_VALIDATOR = Symbol('CUSTOMER_TOKEN_VALIDATOR');

export interface ICustomerTokenValidator {
  validate(token: string, sessionId: string): Promise<{ valid: boolean; customerId?: string; tenantId?: string; role?: string }>;
}

@Injectable()
export class CustomerTokenValidator implements ICustomerTokenValidator {
  constructor(private readonly sessionTokenRepo: CustomerSessionTokenRepository) {}

  async validate(token: string, sessionId: string): Promise<{ valid: boolean; customerId?: string; tenantId?: string; role?: string }> {
    try {
      const result = await this.sessionTokenRepo.validateToken(sessionId, token);
      if (!result) return { valid: false };
      return { valid: true, customerId: result.customer_id, tenantId: result.tenant_id, role: result.role };
    } catch {
      return { valid: false };
    }
  }
}
