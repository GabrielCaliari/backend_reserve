import Stripe from 'stripe';

/**
 * Stripe Provider Interface
 * Abstracts Stripe SDK operations
 */
export interface IStripeProvider {
  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
  }): Promise<Stripe.Checkout.Session>;

  /**
   * Retrieve a subscription from Stripe
   */
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<Stripe.Subscription>;

  /**
   * Create or retrieve a customer
   */
  createOrRetrieveCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer>;

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<Stripe.Event>;

  /**
   * Retrieve a customer by ID
   */
  retrieveCustomer(customerId: string): Promise<Stripe.Customer>;
}

/**
 * Dependency Injection Token
 */
export const STRIPE_PROVIDER = Symbol('STRIPE_PROVIDER');
