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

    // Log event
    await this.webhookEventRepository.create({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event.data.object,
    });

    try {
      // Process event based on type
      switch (event.type) {
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

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // Mark as processed
      await this.webhookEventRepository.markAsProcessed(event.id);
    } catch (error) {
      this.logger.error(`Error processing event ${event.id}:`, error);
      await this.webhookEventRepository.markAsFailed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  private async handleSubscriptionCreatedOrUpdated(
    stripeSubscription: Stripe.Subscription,
    tenantIdFromUrl?: string,
  ): Promise<void> {
    this.logger.log(
      `Processing subscription ${stripeSubscription.id} - Status: ${stripeSubscription.status}`,
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

    // Check if subscription already exists for this tenant OR by stripe subscription ID
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
  }

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
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    this.logger.log(`Invoice ${invoice.id} paid for subscription ${invoice.subscription}`);

    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      invoice.subscription as string,
    );

    if (subscription) {
      subscription.updateStatus(ESubscriptionStatus.ACTIVE);
      await this.subscriptionRepository.update(subscription);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    this.logger.warn(
      `Invoice ${invoice.id} payment failed for subscription ${invoice.subscription}`,
    );

    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      invoice.subscription as string,
    );

    if (subscription) {
      subscription.updateStatus(ESubscriptionStatus.PAST_DUE);
      await this.subscriptionRepository.update(subscription);
    }
  }

  private mapStripeSubscriptionToEntity(
    stripeSubscription: Stripe.Subscription,
    tenantId: string,
    existingId?: string,
  ): StripeSubscriptionEntity {
    const priceId =
      typeof stripeSubscription.items.data[0].price === 'string'
        ? stripeSubscription.items.data[0].price
        : stripeSubscription.items.data[0].price.id;

    const productId =
      typeof stripeSubscription.items.data[0].price === 'string'
        ? undefined
        : typeof stripeSubscription.items.data[0].price.product === 'string'
          ? stripeSubscription.items.data[0].price.product
          : stripeSubscription.items.data[0].price.product?.id;

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
      id: existingId || '',
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
      amount:
        typeof stripeSubscription.items.data[0].price !== 'string'
          ? stripeSubscription.items.data[0].price.unit_amount || 0
          : 0,
      currency:
        typeof stripeSubscription.items.data[0].price !== 'string'
          ? stripeSubscription.items.data[0].price.currency
          : 'brl',
      interval:
        typeof stripeSubscription.items.data[0].price !== 'string'
          ? stripeSubscription.items.data[0].price.recurring?.interval || 'month'
          : 'month',
      intervalCount:
        typeof stripeSubscription.items.data[0].price !== 'string'
          ? stripeSubscription.items.data[0].price.recurring?.interval_count || 1
          : 1,
      metadata: stripeSubscription.metadata,
      createdAt: toDate(stripeSubscription.created),
      updatedAt: new Date(),
    });
  }
}
