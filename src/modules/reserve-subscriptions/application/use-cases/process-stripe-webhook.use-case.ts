import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IStripeSubscriptionRepository,
  STRIPE_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/stripe-subscription.repository.interface';
import {
  IStripeWebhookEventRepository,
  STRIPE_WEBHOOK_EVENT_REPOSITORY,
} from '../../domain/interfaces/stripe-webhook-event.repository.interface';
import { StripeSubscriptionEntity } from '../../domain/entities/stripe-subscription.entity';
import { ESubscriptionStatus } from '../../domain/enums/subscription-status.enum';

@Injectable()
export class ProcessStripeWebhookUseCase {
  private readonly logger = new Logger(ProcessStripeWebhookUseCase.name);

  constructor(
    @Inject(STRIPE_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: IStripeSubscriptionRepository,
    @Inject(STRIPE_WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEventRepository: IStripeWebhookEventRepository,
  ) {}

  async execute(event: Stripe.Event, tenantId?: string): Promise<void> {
    // Check if event already processed (idempotency)
    const exists = await this.webhookEventRepository.exists(event.id);
    if (exists) {
      this.logger.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    // Log event before processing
    await this.webhookEventRepository.create({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event.data.object,
    });

    // Increment attempt counter
    await this.webhookEventRepository.incrementAttempts(event.id);

    try {
      switch (event.type) {
        // ── Checkout completed: subscription created via hosted checkout ──────
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        // ── Subscription lifecycle ────────────────────────────────────────────
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionCreatedOrUpdated(
            event.data.object as Stripe.Subscription,
            tenantId,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        // ── Invoice events ────────────────────────────────────────────────────
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // Mark as processed only on success
      await this.webhookEventRepository.markAsProcessed(event.id);
    } catch (error) {
      this.logger.error(`Error processing event ${event.id} (${event.type}):`, error);
      await this.webhookEventRepository.markAsFailed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * checkout.session.completed
   *
   * Fired when the user completes the Stripe Hosted Checkout.
   * We persist the stripe_customer_id on the Tenant immediately so it is
   * available for future checkouts even if the subscription is later canceled.
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log(`Checkout session completed: ${session.id}`);

    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      this.logger.warn(
        `checkout.session.completed: tenantId not found in session metadata (${session.id}). ` +
          'Ensure tenantId is passed in metadata when creating the checkout session.',
      );
      return;
    }

    // Persist stripe_customer_id on the Tenant so it survives subscription cancellations
    if (session.customer) {
      await this.subscriptionRepository.updateTenantStripeFields(tenantId, {
        stripeCustomerId: session.customer as string,
      });
      this.logger.log(
        `[${tenantId}] Persisted stripe_customer_id ${session.customer} on Tenant`,
      );
    }
  }

  /**
   * customer.subscription.created / customer.subscription.updated
   */
  private async handleSubscriptionCreatedOrUpdated(
    stripeSubscription: Stripe.Subscription,
    tenantIdFromUrl?: string,
  ): Promise<void> {
    this.logger.log(
      `Processing subscription ${stripeSubscription.id} — status: ${stripeSubscription.status}`,
    );

    // Prefer tenantId from the webhook URL (most reliable),
    // fall back to subscription metadata (set during checkout)
    const tenantId = tenantIdFromUrl ?? stripeSubscription.metadata?.tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Ensure the webhook URL includes the tenantId ' +
          '(/api/webhooks/stripe/:tenantId) or that tenantId is set in subscription metadata.',
      );
    }

    // Look up by Stripe subscription ID first, then by tenant
    const existingByStripeId =
      await this.subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.id);
    const existingByTenant = existingByStripeId
      ? null
      : await this.subscriptionRepository.findByTenantId(tenantId);

    const existing = existingByStripeId ?? existingByTenant;

    const subscriptionData = this.mapStripeSubscriptionToEntity(
      stripeSubscription,
      tenantId,
      existing?.id,
    );

    if (existing) {
      await this.subscriptionRepository.update(subscriptionData);
      this.logger.log(`Updated subscription ${stripeSubscription.id} for tenant ${tenantId}`);
    } else {
      await this.subscriptionRepository.create(subscriptionData);
      this.logger.log(`Created subscription ${stripeSubscription.id} for tenant ${tenantId}`);
    }

    // Keep Tenant.stripe_customer_id and Tenant.subscription_status in sync
    await this.subscriptionRepository.updateTenantStripeFields(tenantId, {
      stripeCustomerId: stripeSubscription.customer as string,
      subscriptionStatus: stripeSubscription.status,
    });
  }

  /**
   * customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`Processing subscription deletion ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSubscription.id,
    );

    if (!subscription) {
      this.logger.warn(`Subscription ${stripeSubscription.id} not found in database`);
      return;
    }

    subscription.cancelImmediately();
    await this.subscriptionRepository.update(subscription);
    this.logger.log(`Marked subscription ${stripeSubscription.id} as canceled`);

    // Sync Tenant.subscription_status
    await this.subscriptionRepository.updateTenantStripeFields(subscription.tenantId, {
      subscriptionStatus: 'canceled',
    });
  }

  /**
   * invoice.paid
   *
   * Fired on every successful payment — both the initial charge and
   * all subsequent renewals. We use this to:
   * 1. Confirm the subscription as active
   * 2. Update the billing period dates (renewal advances the period)
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = invoice.subscription as string;
    this.logger.log(`Invoice ${invoice.id} paid — subscription ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      subscriptionId,
    );

    if (!subscription) {
      this.logger.warn(
        `invoice.paid: subscription ${subscriptionId} not found in database. ` +
          'It may arrive via customer.subscription.updated shortly.',
      );
      return;
    }

    // Update status to active and refresh the billing period from the invoice
    subscription.updateStatus(ESubscriptionStatus.ACTIVE);

    if (invoice.period_start && invoice.period_end) {
      subscription.updatePeriod(
        new Date(invoice.period_start * 1000),
        new Date(invoice.period_end * 1000),
      );
    }

    await this.subscriptionRepository.update(subscription);
    this.logger.log(
      `Subscription ${subscriptionId} confirmed active after invoice payment`,
    );

    // Sync Tenant.subscription_status
    await this.subscriptionRepository.updateTenantStripeFields(subscription.tenantId, {
      subscriptionStatus: ESubscriptionStatus.ACTIVE,
    });
  }

  /**
   * invoice.payment_failed
   *
   * Fired when a payment attempt fails. Marks the subscription as past_due
   * so the application can restrict access accordingly.
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = invoice.subscription as string;
    this.logger.warn(
      `Invoice ${invoice.id} payment failed — subscription ${subscriptionId}`,
    );

    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      subscriptionId,
    );

    if (!subscription) {
      this.logger.warn(
        `invoice.payment_failed: subscription ${subscriptionId} not found in database`,
      );
      return;
    }

    subscription.updateStatus(ESubscriptionStatus.PAST_DUE);
    await this.subscriptionRepository.update(subscription);
    this.logger.warn(
      `Subscription ${subscriptionId} marked as past_due after payment failure`,
    );

    // Sync Tenant.subscription_status — this is what guards check
    await this.subscriptionRepository.updateTenantStripeFields(subscription.tenantId, {
      subscriptionStatus: ESubscriptionStatus.PAST_DUE,
    });
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  private mapStripeSubscriptionToEntity(
    stripeSubscription: Stripe.Subscription,
    tenantId: string,
    existingId?: string,
  ): StripeSubscriptionEntity {
    const priceItem = stripeSubscription.items.data[0];
    // price is always a Price object in subscription items (never a string ID)
    const price = priceItem.price as Stripe.Price;

    const priceId = price.id;
    const productId =
      typeof price.product === 'string'
        ? price.product
        : (price.product as Stripe.Product | null)?.id;

    // stripe trigger sends 0 for timestamps — fall back to now() so Prisma doesn't reject
    const toDate = (unix: number | null | undefined, fallback = new Date()): Date => {
      if (!unix || unix <= 0) return fallback;
      const d = new Date(unix * 1000);
      return isNaN(d.getTime()) ? fallback : d;
    };

    const toDateOrUndefined = (unix: number | null | undefined): Date | undefined => {
      if (!unix || unix <= 0) return undefined;
      const d = new Date(unix * 1000);
      return isNaN(d.getTime()) ? undefined : d;
    };

    return new StripeSubscriptionEntity({
      id: existingId ?? '',
      tenantId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      stripePriceId: priceId,
      stripeProductId: productId,
      status: stripeSubscription.status as ESubscriptionStatus,
      currentPeriodStart: toDate(stripeSubscription.current_period_start),
      currentPeriodEnd: toDate(stripeSubscription.current_period_end),
      trialStart: toDateOrUndefined(stripeSubscription.trial_start),
      trialEnd: toDateOrUndefined(stripeSubscription.trial_end),
      canceledAt: toDateOrUndefined(stripeSubscription.canceled_at),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      amount: price?.unit_amount ?? 0,
      currency: price?.currency ?? 'brl',
      interval: price?.recurring?.interval ?? 'month',
      intervalCount: price?.recurring?.interval_count ?? 1,
      metadata: stripeSubscription.metadata as Record<string, any>,
      createdAt: toDate(stripeSubscription.created),
      updatedAt: new Date(),
    });
  }
}
