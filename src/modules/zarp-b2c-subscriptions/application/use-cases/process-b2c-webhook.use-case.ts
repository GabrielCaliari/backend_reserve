import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import Stripe from 'stripe';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';
import {
  IB2CStripeWebhookEventRepository,
  B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY,
} from '../../domain/interfaces/b2c-stripe-webhook-event.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { EUserSubscriptionStatus } from '../../domain/enums/user-subscription-status.enum';

@Injectable()
export class ProcessB2CWebhookUseCase {
  private readonly logger = new Logger(ProcessB2CWebhookUseCase.name);

  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    @Inject(B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEventRepo: IB2CStripeWebhookEventRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    // Idempotency check
    const alreadyProcessed = await this.webhookEventRepo.existsByStripeEventId(event.id);
    if (alreadyProcessed) {
      this.logger.log(`Event ${event.id} already processed, skipping`);
      return;
    }

    // Persist event before processing
    await this.webhookEventRepo.create({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event,
    });

    // Dispatch to handler
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
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
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const productId = session.metadata?.productId;
    const priceId = session.metadata?.priceId;
    const tenantId = session.metadata?.tenantId;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId || !productId || !priceId || !tenantId || !stripeSubscriptionId) {
      throw new BadRequestException('Missing metadata in checkout.session.completed');
    }

    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId) ?? undefined;

    // Retrieve subscription details from Stripe using tenant's key
    const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId, stripeSecretKey);
    const customerId = session.customer as string;

    // Upsert stripe_customer_id on User
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customerId },
    });

    // Create UserSubscription
    await this.userSubscriptionRepo.create({
      tenantId,
      userId,
      productId,
      productPriceId: priceId,
      stripeSubscriptionId,
      stripeCustomerId: customerId,
      stripePriceId: stripeSub.items.data[0].price.id,
      status: stripeSub.status as EUserSubscriptionStatus,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : undefined,
      trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : undefined,
      amount: stripeSub.items.data[0].price.unit_amount ?? 0,
      currency: stripeSub.currency,
    });

    this.logger.log(`UserSubscription created for user ${userId}, product ${productId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = (subscription.metadata as any)?.tenantId;
    if (!tenantId) return;

    await this.userSubscriptionRepo.updateByStripeSubscriptionId(tenantId, subscription.id, {
      status: subscription.status as EUserSubscriptionStatus,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    this.logger.log(`UserSubscription updated: ${subscription.id}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = (subscription.metadata as any)?.tenantId;
    if (!tenantId) return;

    await this.userSubscriptionRepo.updateByStripeSubscriptionId(tenantId, subscription.id, {
      status: EUserSubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    });

    this.logger.log(`UserSubscription canceled: ${subscription.id}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const tenantId = (invoice as any).metadata?.tenantId
      ?? (invoice.subscription_details?.metadata as any)?.tenantId;
    if (!tenantId) return;

    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId) ?? undefined;
    const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId, stripeSecretKey);

    await this.userSubscriptionRepo.updateByStripeSubscriptionId(tenantId, stripeSubscriptionId, {
      status: EUserSubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });

    this.logger.log(`Invoice paid, subscription renewed: ${stripeSubscriptionId}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const tenantId = (invoice as any).metadata?.tenantId
      ?? (invoice.subscription_details?.metadata as any)?.tenantId;
    if (!tenantId) return;

    await this.userSubscriptionRepo.updateByStripeSubscriptionId(tenantId, stripeSubscriptionId, {
      status: EUserSubscriptionStatus.PAST_DUE,
    });

    this.logger.log(`Invoice payment failed, subscription past_due: ${stripeSubscriptionId}`);
  }
}
