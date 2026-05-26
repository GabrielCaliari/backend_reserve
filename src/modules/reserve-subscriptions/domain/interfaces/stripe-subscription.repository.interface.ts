import { StripeSubscriptionEntity } from '../entities/stripe-subscription.entity';

/**
 * Repository interface for Stripe Subscriptions
 */
export interface IStripeSubscriptionRepository {
  create(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity>;
  findById(id: string): Promise<StripeSubscriptionEntity | null>;
  findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<StripeSubscriptionEntity | null>;
  findActiveByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null>;
  findByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null>;
  update(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity>;
  delete(id: string): Promise<void>;

  /**
   * Updates the denormalized Stripe fields on the Tenant row.
   * Called by webhook handlers to keep Tenant.subscription_status and
   * Tenant.stripe_customer_id in sync without an extra repository dependency.
   */
  updateTenantStripeFields(
    tenantId: string,
    fields: {
      stripeCustomerId?: string;
      subscriptionStatus?: string;
    },
  ): Promise<void>;
}

export const STRIPE_SUBSCRIPTION_REPOSITORY = Symbol('STRIPE_SUBSCRIPTION_REPOSITORY');
