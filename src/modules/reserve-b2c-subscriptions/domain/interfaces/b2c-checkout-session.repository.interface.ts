import { B2CCheckoutSessionEntity, B2CCheckoutStatus } from '../entities/b2c-checkout-session.entity';

export const B2C_CHECKOUT_SESSION_REPOSITORY = Symbol('B2C_CHECKOUT_SESSION_REPOSITORY');

export interface CreateB2CCheckoutSessionData {
  tenantId: string;
  userId?: string | null;
  productId: string;
  priceId: string;
  stripeCheckoutId: string;
  stripePriceId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  isLeadPurchase?: boolean;
  metadata?: Record<string, any> | null;
}

export interface IB2CCheckoutSessionRepository {
  create(data: CreateB2CCheckoutSessionData): Promise<B2CCheckoutSessionEntity>;
  findByStripeCheckoutId(stripeCheckoutId: string): Promise<B2CCheckoutSessionEntity | null>;
  findAllByTenant(
    tenantId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ data: B2CCheckoutSessionEntity[]; total: number }>;
  updateStatus(
    stripeCheckoutId: string,
    status: B2CCheckoutStatus,
    completedAt?: Date,
    expiredAt?: Date,
  ): Promise<void>;
}
