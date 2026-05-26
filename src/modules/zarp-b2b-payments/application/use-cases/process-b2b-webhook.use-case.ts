import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../zarp-coupons/domain/interfaces/discount-coupon.repository.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { SendActivationEmailUseCase } from '../../../zarp-licensefix/application/use-cases/send-activation-email.use-case';

@Injectable()
export class ProcessB2BWebhookUseCase {
  private readonly logger = new Logger(ProcessB2BWebhookUseCase.name);

  constructor(
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
    private readonly prisma: PrismaService,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    @Optional() private readonly sendActivationEmail: SendActivationEmailUseCase,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.log(`Unhandled B2B event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    const checkoutId = session.id;

    if (!tenantId) {
      this.logger.warn(`checkout.session.completed missing tenant_id in metadata: ${checkoutId}`);
      return;
    }

    const customerEmail = session.customer_details?.email ?? session.metadata?.lead_email ?? '';
    const customerName = session.customer_details?.name ?? session.metadata?.lead_name ?? undefined;

    // Resolve user by email
    const existingUser = await this.prisma.user.findFirst({
      where: { email: customerEmail },
      select: { id: true },
    });
    const userId = existingUser?.id;

    // Update B2B purchase if it exists (B2B or mixed cart)
    const purchase = await this.purchaseRepo.findByStripeCheckoutId(tenantId, checkoutId);
    if (purchase) {
      await this.purchaseRepo.updateByStripeCheckoutId(tenantId, checkoutId, {
        status: EPurchaseStatus.COMPLETED,
        stripePaymentIntent: (session.payment_intent as string) ?? undefined,
        userId,
        checkoutCompletedAt: new Date(),
      });
      this.logger.log(`B2B purchase completed: ${purchase.id} (tenant: ${tenantId}, email: ${customerEmail})`);
    }

    // Upsert Customer (tenant-scoped) and send activation email if not yet activated
    if (customerEmail && tenantId) {
      try {
        let customer = await this.prisma.customer.findUnique({
          where: { tenant_id_email: { tenant_id: tenantId, email: customerEmail } },
        });

        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              tenant_id: tenantId,
              email: customerEmail,
              name: customerName ?? 'Lead',
              stripe_customer_id: (session.customer as string) ?? null,
            },
          });
          this.logger.log(`Customer created from B2B purchase: ${customer.id} (${customerEmail})`);
        }

        if (this.sendActivationEmail) {
          await this.sendActivationEmail.execute(customer.id, customerEmail, customer.name, tenantId);
          this.logger.log(`Activation email sent to ${customerEmail} (customer: ${customer.id})`);
        }

      } catch (err) {
        this.logger.error(`Failed to create customer or send activation email for ${customerEmail}: ${err}`);
      }
    }

    // Grant B2C access for all unified carts (B2B+B2C or B2C-only)
    const b2cPriceIds = session.metadata?.b2c_price_ids?.split(',').filter(Boolean) ?? [];
    if (b2cPriceIds.length > 0) {
      await this.grantUnifiedB2CAccess(session, tenantId, b2cPriceIds, userId, customerEmail, customerName);
    } else if (!purchase) {
      this.logger.warn(`No B2B purchase and no B2C price IDs for checkout ${checkoutId} — nothing to process`);
    }

    // Archive Stripe coupon if one was used
    const stripeCouponId = session.metadata?.stripe_coupon_id;
    if (stripeCouponId) {
      try {
        const stripeSecretKey = await this.billingConfigRepo?.getStripeSecretKey?.(tenantId);
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' as any });
          await stripe.coupons.del(stripeCouponId);
          this.logger.log(`Archived Stripe coupon ${stripeCouponId} after completed checkout ${checkoutId}`);
        }
      } catch (err) {
        this.logger.warn(`Could not archive Stripe coupon ${stripeCouponId}: ${err}`);
      }
    }
  }

  private async grantUnifiedB2CAccess(
    session: Stripe.Checkout.Session,
    tenantId: string,
    b2cPriceIds: string[],
    userId: string | undefined,
    customerEmail: string,
    customerName: string | undefined,
  ): Promise<void> {
    const customerId = session.customer as string;

    // Resolve or create user for B2C access
    let resolvedUserId = userId;
    if (!resolvedUserId && customerEmail) {
      const existing = await this.prisma.user.findFirst({
        where: { email: customerEmail },
        select: { id: true },
      });

      if (existing) {
        resolvedUserId = existing.id;
      } else {
        const freePlan = await this.prisma.plan.findFirst({
          where: { slug: process.env.FREE_PLAN_SLUG ?? 'free' },
          select: { id: true },
        });

        if (freePlan) {
          const newUser = await this.prisma.user.create({
            data: {
              email: customerEmail,
              name: customerName ?? 'Lead',
              cpf: '',
              phone_number: session.metadata?.lead_phone ?? '',
              plan_id: freePlan.id,
              stripe_customer_id: customerId ?? '',
            },
          });
          resolvedUserId = newUser.id;
          this.logger.log(`Created user from unified cart lead: ${resolvedUserId} (${customerEmail})`);
        }
      }
    }

    if (!resolvedUserId) {
      this.logger.warn(`Could not resolve userId for B2C access in unified cart ${session.id}`);
      return;
    }

    // Look up ProductPrice records for all B2C items
    const prices = await this.prisma.productPrice.findMany({
      where: { id: { in: b2cPriceIds }, tenant_id: tenantId },
      select: {
        id: true,
        product_id: true,
        billing_mode: true,
        access_duration_days: true,
        unit_amount: true,
        currency: true,
      },
    });

    for (const price of prices) {
      const billingMode = price.billing_mode as string;
      const isOneTimeExp = billingMode === 'one_time_exp';
      const accessType = isOneTimeExp ? 'temporary' : 'lifetime';
      const expiresAt =
        isOneTimeExp && price.access_duration_days
          ? new Date(Date.now() + price.access_duration_days * 24 * 60 * 60 * 1000)
          : null;

      try {
        await this.prisma.userProductAccess.create({
          data: {
            tenant_id: tenantId,
            user_id: resolvedUserId,
            product_id: price.product_id,
            product_price_id: price.id,
            stripe_customer_id: customerId ?? '',
            stripe_price_id: price.id,
            stripe_payment_intent_id: (session.payment_intent as string) ?? '',
            access_type: accessType,
            status: 'active',
            access_granted_at: new Date(),
            access_expires_at: expiresAt,
            completed_billing_cycles: 0,
            amount: price.unit_amount,
            currency: price.currency,
            cancel_at_period_end: false,
          },
        });
        this.logger.log(`B2C access granted: user=${resolvedUserId} product=${price.product_id} mode=${billingMode}`);
      } catch (err) {
        this.logger.error(`Failed to grant B2C access for price ${price.id}: ${err}`);
      }
    }

    // Mark B2C checkout session as completed
    try {
      await this.prisma.b2CCheckoutSession.updateMany({
        where: { stripe_checkout_id: session.id, tenant_id: tenantId },
        data: { status: 'completed', checkout_completed_at: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Could not update B2CCheckoutSession for unified cart ${session.id}: ${err}`);
    }
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenant_id;
    if (!tenantId) return;

    // Update B2B purchase if it exists
    const purchase = await this.purchaseRepo.findByStripeCheckoutId(tenantId, session.id);
    if (purchase) {
      await this.purchaseRepo.updateByStripeCheckoutId(tenantId, session.id, {
        status: EPurchaseStatus.ABANDONED,
        checkoutAbandonedAt: new Date(),
      });
    }

    // Mark B2C checkout session as expired/abandoned for unified carts
    try {
      await this.prisma.b2CCheckoutSession.updateMany({
        where: { stripe_checkout_id: session.id, tenant_id: tenantId },
        data: { status: 'abandoned', checkout_expired_at: new Date() },
      });
    } catch {
      // Non-critical — only exists for unified carts with B2C items
    }

    this.logger.log(`B2B checkout abandoned: ${session.id} (tenant: ${tenantId})`);

    // Archive Stripe coupon and roll back redemptions if session expired
    const stripeCouponId = session.metadata?.stripe_coupon_id;
    const couponCodesStr = session.metadata?.coupon_codes;
    if (stripeCouponId || couponCodesStr) {
      const stripeKey = await this.billingConfigRepo?.getStripeSecretKey?.(tenantId);
      if (stripeCouponId && stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' as any });
          await stripe.coupons.del(stripeCouponId);
        } catch (err) {
          this.logger.warn(`Could not archive Stripe coupon ${stripeCouponId} on expiry: ${err}`);
        }
      }
      if (couponCodesStr) {
        const codes = couponCodesStr.split(',').filter(Boolean);
        for (const code of codes) {
          await this.couponRepo.decrementRedeemedCount(tenantId, code);
        }
        this.logger.log(`Rolled back redemptions for coupons [${codes.join(', ')}] — checkout expired`);
      }
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const tenantId = charge.metadata?.tenant_id;
    if (!tenantId || !charge.payment_intent) return;

    // Find purchase by payment_intent
    const purchases = await this.prisma.b2BPurchase.findMany({
      where: {
        tenant_id: tenantId,
        stripe_payment_intent: charge.payment_intent as string,
      },
      select: { stripe_checkout_id: true },
    });

    for (const p of purchases) {
      if (p.stripe_checkout_id) {
        await this.purchaseRepo.updateByStripeCheckoutId(tenantId, p.stripe_checkout_id, {
          status: EPurchaseStatus.REFUNDED,
        });
      }
    }

    this.logger.log(`B2B charge refunded for payment_intent: ${charge.payment_intent}`);
  }
}
