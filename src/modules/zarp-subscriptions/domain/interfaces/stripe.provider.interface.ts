import Stripe from 'stripe';

/**
 * Stripe Provider Interface
 * Abstracts Stripe SDK operations
 */
export interface IStripeProvider {
  /**
   * Create a checkout session for subscription.
   * If stripeSecretKey is provided, uses it instead of the global env var.
   */
  createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
    stripeSecretKey?: string;
  }): Promise<Stripe.Checkout.Session>;

  /**
   * Retrieve a subscription from Stripe.
   */
  retrieveSubscription(subscriptionId: string, stripeSecretKey?: string): Promise<Stripe.Subscription>;

  /**
   * Cancel a subscription.
   * If stripeSecretKey is provided, uses it instead of the global env var.
   */
  cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    stripeSecretKey?: string,
  ): Promise<Stripe.Subscription>;

  /**
   * Create or retrieve a customer by email.
   */
  createOrRetrieveCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
    stripeSecretKey?: string;
  }): Promise<Stripe.Customer>;

  /**
   * Construct webhook event from raw body and signature.
   * Uses the provided webhookSecret (per-tenant) or falls back to env var.
   */
  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret?: string,
  ): Promise<Stripe.Event>;

  /**
   * Retrieve a customer by ID.
   */
  retrieveCustomer(customerId: string, stripeSecretKey?: string): Promise<Stripe.Customer>;

  /**
   * Create a Stripe Billing Portal session so the customer can manage
   * their subscription (update payment method, view invoices, cancel, etc.).
   */
  createBillingPortalSession(params: {
    customerId: string;
    returnUrl: string;
    stripeSecretKey?: string;
  }): Promise<Stripe.BillingPortal.Session>;
}

/**
 * Dependency Injection Token
 */
export const STRIPE_PROVIDER = Symbol('STRIPE_PROVIDER');
