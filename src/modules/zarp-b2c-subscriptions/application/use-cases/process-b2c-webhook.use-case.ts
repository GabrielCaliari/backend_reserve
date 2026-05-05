import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import Stripe from 'stripe';
import {
  IUserProductAccessRepository,
  USER_PRODUCT_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-product-access.repository.interface';
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
import { EBillingMode, EAccessType } from '../../domain/enums/product-type.enum';

@Injectable()
export class ProcessB2CWebhookUseCase {
  private readonly logger = new Logger(ProcessB2CWebhookUseCase.name);

  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
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
    const productId = session.metadata?.productId;
    const priceId = session.metadata?.priceId;
    const tenantId = session.metadata?.tenantId;
    const billingMode = session.metadata?.billingMode || EBillingMode.UNLIMITED;
    const maxBillingCycles = session.metadata?.maxBillingCycles ? parseInt(session.metadata.maxBillingCycles) : undefined;
    const accessDurationDays = session.metadata?.accessDurationDays ? parseInt(session.metadata.accessDurationDays) : undefined;
    const isLeadPurchase = session.metadata?.is_lead_purchase === 'true';

    if (!productId || !priceId || !tenantId) {
      throw new BadRequestException('Missing metadata in checkout.session.completed');
    }

    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId) ?? undefined;
    const customerId = session.customer as string;

    // ─── Resolve userId ────────────────────────────────────────────────────────
    // Usuário autenticado: userId vem direto na metadata
    // Lead: busca por email ou cria novo user
    let userId: string;

    if (!isLeadPurchase && session.metadata?.userId) {
      userId = session.metadata.userId;

      // Atualiza stripe_customer_id no user existente
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripe_customer_id: customerId },
      });
    } else {
      // Lead purchase — resolve user pelo email
      const leadEmail = session.metadata?.lead_email ?? session.customer_details?.email;
      const leadName = session.metadata?.lead_name ?? session.customer_details?.name ?? 'Lead';

      if (!leadEmail) {
        throw new BadRequestException('Missing lead_email in checkout metadata for lead purchase');
      }

      // Busca user existente pelo email
      const existingUser = await this.prisma.user.findFirst({
        where: { email: leadEmail },
        select: { id: true },
      });

      if (existingUser) {
        userId = existingUser.id;
        // Atualiza customerId se ainda não tiver
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripe_customer_id: customerId },
        });
      } else {
        // Cria novo user a partir dos dados do lead
        // Busca o plano free para associar ao novo user
        const freePlan = await this.prisma.plan.findFirst({
          where: { slug: process.env.FREE_PLAN_SLUG ?? 'free' },
          select: { id: true },
        });

        if (!freePlan) {
          throw new BadRequestException('Free plan not found — cannot create user from lead');
        }

        const newUser = await this.prisma.user.create({
          data: {
            email: leadEmail,
            name: leadName,
            cpf: '',
            phone_number: session.metadata?.lead_phone ?? '',
            plan_id: freePlan.id,
            stripe_customer_id: customerId,
          },
        });

        userId = newUser.id;
        this.logger.log(`New user created from lead purchase: ${userId} (${leadEmail})`);
      }
    }

    // ─── Create UserProductAccess ──────────────────────────────────────────────
    const isSubscription = [EBillingMode.UNLIMITED, EBillingMode.LIMITED].includes(billingMode as EBillingMode);

    if (isSubscription) {
      // Subscription modes (unlimited/limited)
      const stripeSubscriptionId = session.subscription as string;
      if (!stripeSubscriptionId) {
        throw new BadRequestException('Missing subscription ID for subscription mode');
      }

      const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId, stripeSecretKey);

      await this.accessRepo.create({
        tenant_id: tenantId,
        user_id: userId,
        product_id: productId,
        product_price_id: priceId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: customerId,
        stripe_price_id: stripeSub.items.data[0].price.id,
        access_type: EAccessType.SUBSCRIPTION,
        status: stripeSub.status,
        current_period_start: new Date(stripeSub.current_period_start * 1000),
        current_period_end: new Date(stripeSub.current_period_end * 1000),
        trial_start: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : undefined,
        trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : undefined,
        access_granted_at: new Date(),
        max_billing_cycles: maxBillingCycles,
        completed_billing_cycles: 1,
        amount: stripeSub.items.data[0].price.unit_amount ?? 0,
        currency: stripeSub.currency,
        cancel_at_period_end: false,
      });

      this.logger.log(`UserProductAccess (subscription) created for user ${userId}, product ${productId}, mode ${billingMode}`);
    } else {
      // One-time payment modes (one_time/one_time_exp)
      const accessType = billingMode === EBillingMode.ONE_TIME ? EAccessType.LIFETIME : EAccessType.TEMPORARY;
      const expiresAt = billingMode === EBillingMode.ONE_TIME_EXP && accessDurationDays
        ? new Date(Date.now() + accessDurationDays * 24 * 60 * 60 * 1000)
        : undefined;

      await this.accessRepo.create({
        tenant_id: tenantId,
        user_id: userId,
        product_id: productId,
        product_price_id: priceId,
        stripe_customer_id: customerId,
        stripe_price_id: session.metadata.priceId!,
        stripe_payment_intent_id: session.payment_intent as string,
        access_type: accessType,
        status: 'active',
        access_granted_at: new Date(),
        access_expires_at: expiresAt,
        completed_billing_cycles: 0,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'brl',
        cancel_at_period_end: false,
      });

      this.logger.log(`UserProductAccess (${accessType}) created for user ${userId}, product ${productId}, mode ${billingMode}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const access = await this.accessRepo.findByStripeSubscriptionId(subscription.id);
    if (!access) return;

    await this.accessRepo.update(access.id, {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    this.logger.log(`UserProductAccess updated: ${subscription.id}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const access = await this.accessRepo.findByStripeSubscriptionId(subscription.id);
    if (!access) return;

    await this.accessRepo.update(access.id, {
      status: 'canceled',
      canceled_at: new Date(),
    });

    this.logger.log(`UserProductAccess canceled: ${subscription.id}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const access = await this.accessRepo.findByStripeSubscriptionId(stripeSubscriptionId);
    if (!access) return;

    const tenantId = access.tenant_id;
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId) ?? undefined;
    const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId, stripeSecretKey);

    // Increment billing cycle count
    const newCycleCount = access.completed_billing_cycles + 1;

    // Update period and counter
    await this.accessRepo.update(access.id, {
      status: 'active',
      current_period_start: new Date(stripeSub.current_period_start * 1000),
      current_period_end: new Date(stripeSub.current_period_end * 1000),
      completed_billing_cycles: newCycleCount,
    });

    // If limited mode and reached max cycles, cancel
    if (access.max_billing_cycles && newCycleCount >= access.max_billing_cycles) {
      await this.stripeProvider.cancelSubscription(stripeSubscriptionId, false, stripeSecretKey);

      await this.accessRepo.update(access.id, {
        status: 'canceled',
        canceled_at: new Date(),
      });

      this.logger.log(`Limited subscription reached max cycles and canceled: ${stripeSubscriptionId}`);
    } else {
      this.logger.log(`Invoice paid, subscription renewed: ${stripeSubscriptionId} (cycle ${newCycleCount}/${access.max_billing_cycles || '∞'})`);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const access = await this.accessRepo.findByStripeSubscriptionId(stripeSubscriptionId);
    if (!access) return;

    await this.accessRepo.update(access.id, {
      status: 'past_due',
    });

    this.logger.log(`Invoice payment failed, subscription past_due: ${stripeSubscriptionId}`);
  }
}
