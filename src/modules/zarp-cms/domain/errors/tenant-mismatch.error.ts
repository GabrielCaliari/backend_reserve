import { DomainException } from '@/shared/exceptions/domain.exception';

/**
 * Thrown when entities from different tenants are incorrectly associated.
 * Enforces multi-tenant isolation boundaries.
 */
export class TenantMismatchError extends DomainException {
  constructor(message: string, details?: unknown) {
    super(message, 'TENANT_MISMATCH', details);
    this.name = 'TenantMismatchError';
  }
}
