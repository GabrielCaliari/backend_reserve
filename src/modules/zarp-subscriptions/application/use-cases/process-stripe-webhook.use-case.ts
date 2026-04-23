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

  async execute(event: Stripe.Event): Promise<void> {
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
  ): Promise<void> {
    this.logger.log(
      `Processing subscription ${stripeSubscription.id} - Status: ${stripeSubscription.status}`,
    );

    // Extract tenant ID from metadata
    const tenantId = stripeSubscription.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in subscription metadata');
    }

    // Check if subscription already exists
    const existingSubscription =
      await this.subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.id);

    const subscriptionData = this.mapStripeSubscriptionToEntity(
      stripeSubscription,
      tenantId,
      existingSubscription?.id,
    );

    if (existingSubscription) {
      // Update existing subscription
      await this.subscriptionRepository.update(subscriptionData);
      this.logger.log(`Updated subscription ${stripeSubscription.id}`);
    } else {
      // Create new subscription
      await this.subscriptionRepository.create(subscriptionData);
      this.logger.log(`Created subscription ${stripeSubscription.id}`);
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

    return new StripeSubscriptionEntity({
      id: existingId || '', // Will be generated by repository if empty
      tenantId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      stripePriceId: priceId,
      stripeProductId: productId,
      status: stripeSubscription.status as ESubscriptionStatus,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start
        ? new Date(stripeSubscription.trial_start * 1000)
        : undefined,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : undefined,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : undefined,
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
      createdAt: new Date(stripeSubscription.created * 1000),
      updatedAt: new Date(),
    });
  }
}
