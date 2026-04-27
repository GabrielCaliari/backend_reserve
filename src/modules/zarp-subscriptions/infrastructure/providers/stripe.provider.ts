import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IStripeProvider } from '../../domain/interfaces/stripe.provider.interface';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@Injectable()
export class StripeProvider implements IStripeProvider {
  private readonly logger = new Logger(StripeProvider.name);

  /** Global Stripe client — lazy, uses STRIPE_SECRET_KEY env var */
  private _globalStripe: Stripe | null = null;

  private get globalStripe(): Stripe {
    if (!this._globalStripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error(
          'STRIPE_SECRET_KEY is not configured. Add it to your .env file to use Stripe features.',
        );
      }
      this._globalStripe = new Stripe(secretKey, {
        apiVersion: STRIPE_API_VERSION,
        typescript: true,
      });
      this.logger.log('Global Stripe SDK initialized');
    }
    return this._globalStripe;
  }

  /**
   * Returns a Stripe client for the given secret key.
   * If no key is provided, falls back to the global client (env var).
   * Per-tenant clients are NOT cached — they are created on demand.
   */
  private getClient(stripeSecretKey?: string): Stripe {
    if (!stripeSecretKey) return this.globalStripe;
    return new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }

  // ─── Checkout ──────────────────────────────────────────────────────────────

  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
    stripeSecretKey?: string;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getClient(params.stripeSecretKey);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    if (params.trialPeriodDays) {
      sessionParams.subscription_data = {
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata,
      };
    } else if (params.metadata) {
      sessionParams.subscription_data = { metadata: params.metadata };
    }

    return stripe.checkout.sessions.create(sessionParams);
  }

  // ─── Billing Portal ────────────────────────────────────────────────────────

  /**
   * Creates a Stripe Billing Portal session.
   * The customer can manage their subscription, update payment methods,
   * view invoices, and cancel — all within Stripe's hosted UI.
   */
  async createBillingPortalSession(params: {
    customerId: string;
    returnUrl: string;
    stripeSecretKey?: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getClient(params.stripeSecretKey);
    return stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async retrieveSubscription(
    subscriptionId: string,
    stripeSecretKey?: string,
  ): Promise<Stripe.Subscription> {
    return this.getClient(stripeSecretKey).subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
    stripeSecretKey?: string,
  ): Promise<Stripe.Subscription> {
    const stripe = this.getClient(stripeSecretKey);
    if (cancelAtPeriodEnd) {
      return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    }
    return stripe.subscriptions.cancel(subscriptionId);
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async createOrRetrieveCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
    stripeSecretKey?: string;
  }): Promise<Stripe.Customer> {
    const stripe = this.getClient(params.stripeSecretKey);

    const existing = await stripe.customers.list({ email: params.email, limit: 1 });
    if (existing.data.length > 0) return existing.data[0];

    return stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
  }

  async retrieveCustomer(
    customerId: string,
    stripeSecretKey?: string,
  ): Promise<Stripe.Customer> {
    return (await this.getClient(stripeSecretKey).customers.retrieve(customerId)) as Stripe.Customer;
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────

  /**
   * Validates the Stripe webhook signature and constructs the event.
   *
   * @param webhookSecret - Per-tenant webhook secret. Falls back to
   *   STRIPE_WEBHOOK_SECRET env var if not provided.
   */
  async constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret?: string,
  ): Promise<Stripe.Event> {
    const secret = webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        'Stripe webhook secret is not configured. ' +
          'Set STRIPE_WEBHOOK_SECRET in .env or configure it per-tenant via billing config.',
      );
    }

    try {
      // constructEvent is synchronous — no need for a specific client key here
      return this.globalStripe
        ? this.globalStripe.webhooks.constructEvent(rawBody, signature, secret)
        : new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
            apiVersion: STRIPE_API_VERSION,
          }).webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}
