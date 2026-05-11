import Stripe from 'stripe';

/**
 * Stripe Provider Interface
 * Abstracts Stripe SDK operations
 */
export interface IStripeProvider {
  // ─── Products ──────────────────────────────────────────────────────────────

  /**
   * Create a product in Stripe.
   */
  createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    stripeSecretKey?: string;
  }): Promise<Stripe.Product>;

  /**
   * Archive a product in Stripe (sets active=false).
   * Never deletes — preserves billing history.
   */
  archiveProduct(productId: string, stripeSecretKey?: string): Promise<Stripe.Product>;

  /**
   * List all active products.
   */
  listProducts(stripeSecretKey?: string): Promise<Stripe.Product[]>;

  /**
   * List all products (including inactive).
   */
  listAllProducts(includeInactive?: boolean, stripeSecretKey?: string): Promise<Stripe.Product[]>;

  // ─── Prices ────────────────────────────────────────────────────────────────

  /**
   * Create a recurring price linked to a product.
   * unitAmount is in cents (e.g. 9990 = R$ 99,90).
   */
  createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
    stripeSecretKey?: string;
  }): Promise<Stripe.Price>;

  /**
   * Create a one-time (non-recurring) price linked to a product.
   */
  createOneTimePrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    metadata?: Record<string, string>;
    stripeSecretKey?: string;
  }): Promise<Stripe.Price>;

  /**
   * Archive a price in Stripe (sets active=false).
   */
  archivePrice(priceId: string, stripeSecretKey?: string): Promise<Stripe.Price>;

  /**
   * List active prices for a given product.
   */
  listPricesForProduct(productId: string, stripeSecretKey?: string): Promise<Stripe.Price[]>;

  /**
   * List all prices (optionally filtered by active status).
   */
  listAllPrices(active?: boolean, stripeSecretKey?: string): Promise<Stripe.Price[]>;

  // ─── Checkout ──────────────────────────────────────────────────────────────
  createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
    stripeSecretKey?: string;
    /** Stripe checkout mode. Defaults to 'subscription'. Use 'payment' for one-time billing modes. */
    mode?: 'subscription' | 'payment';
    /**
     * Coupon ID to attach to the Stripe subscription (subscription mode only).
     * Sets subscription_data.coupon — the most reliable way to discount subscriptions.
     */
    subscriptionCoupon?: string;
    /**
     * Coupon ID to apply to a payment-mode session via discounts[].
     * Creates a visual discount line on the Stripe Checkout page.
     * (Use subscriptionCoupon for subscription mode instead.)
     * NOTE: Stripe does NOT accept negative unit_amount in price_data — always use this field.
     */
    sessionCoupon?: string;
    /** Extra subscription_data (metadata, trial, etc). Only used when mode='subscription'. */
    subscriptionData?: { metadata?: Record<string, string>; trial_period_days?: number };
  }): Promise<Stripe.Checkout.Session>;

  /**
   * Retrieve a subscription from Stripe.
   */
  retrieveSubscription(subscriptionId: string, stripeSecretKey?: string): Promise<Stripe.Subscription>;

  /**
   * List subscriptions for a customer.
   */
  listCustomerSubscriptions(customerId: string, stripeSecretKey?: string): Promise<Stripe.Subscription[]>;

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
