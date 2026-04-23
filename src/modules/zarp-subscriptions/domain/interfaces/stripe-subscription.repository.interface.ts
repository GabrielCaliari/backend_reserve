import { StripeSubscriptionEntity } from '../entities/stripe-subscription.entity';

/**
 * Repository interface for Stripe Subscriptions
 * Defines the contract for data access
 */
export interface IStripeSubscriptionRepository {
  /**
   * Create a new subscription
   */
  create(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity>;

  /**
   * Find subscription by ID
   */
  findById(id: string): Promise<StripeSubscriptionEntity | null>;

  /**
   * Find subscription by Stripe subscription ID
   */
  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<StripeSubscriptionEntity | null>;

  /**
   * Find active subscription by tenant ID
   */
  findActiveByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null>;

  /**
   * Find subscription by tenant ID (any status)
   */
  findByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null>;

  /**
   * Update subscription
   */
  update(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity>;

  /**
   * Delete subscription
   */
  delete(id: string): Promise<void>;
}

/**
 * Dependency Injection Token
 */
export const STRIPE_SUBSCRIPTION_REPOSITORY = Symbol('STRIPE_SUBSCRIPTION_REPOSITORY');
