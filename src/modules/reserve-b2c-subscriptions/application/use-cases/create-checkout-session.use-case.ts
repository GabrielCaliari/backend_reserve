import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IUserProductAccessRepository,
  USER_PRODUCT_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-product-access.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../reserve-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../reserve-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import {
  IB2CCheckoutSessionRepository,
  B2C_CHECKOUT_SESSION_REPOSITORY,
} from '../../domain/interfaces/b2c-checkout-session.repository.interface';
import { EBillingMode } from '../../domain/enums/product-type.enum';
import { ValidateCouponUseCase } from '../../../reserve-coupons/application/use-cases/validate-coupon.use-case';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../../reserve-coupons/domain/interfaces/discount-coupon.repository.interface';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    @Inject(B2C_CHECKOUT_SESSION_REPOSITORY)
    private readonly checkoutSessionRepo: IB2CCheckoutSessionRepository,
    private readonly prisma: PrismaService,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(dto: {
    tenantId: string;
    userId?: string;        // Opcional: undefined para leads não autenticados
    priceId: string;
    leadName?: string;      // Obrigatório se userId não informado
    leadEmail?: string;     // Obrigatório se userId não informado
    leadPhone?: string;     // Obrigatório se userId não informado
    couponCodes?: string[]; // Opcional: códigos de cupom a aplicar
  }): Promise<{ checkoutUrl: string }> {
    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(dto.tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. Configure it via billing config.',
      );
    }

    // 2. Validate price exists and is active (scoped to tenant)
    const price = await this.prisma.productPrice.findFirst({
      where: { id: dto.priceId, tenant_id: dto.tenantId, active: true },
      include: { Product: true },
    });

    if (!price || !price.Product.active) {
      throw new NotFoundException('Price not found or inactive');
    }

    // 3. Resolve user — autenticado ou lead
    let userId: string | undefined = dto.userId;
    let customerEmail: string;
    let customerName: string;

    if (userId) {
      // Usuário autenticado: carrega dados do banco
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      customerEmail = user.email;
      customerName = user.name;

      // Verifica acesso ativo apenas para usuários autenticados
      const alreadyHasAccess = await this.accessRepo.hasActiveAccess(userId, price.Product.slug);
      if (alreadyHasAccess) {
        throw new ConflictException('You already have an active subscription for this product');
      }
    } else {
      // Lead não autenticado: valida campos obrigatórios
      if (!dto.leadEmail || !dto.leadName) {
        throw new BadRequestException(
          'leadName and leadEmail are required for unauthenticated checkout',
        );
      }
      customerEmail = dto.leadEmail;
      customerName = dto.leadName;

      // Tenta encontrar user existente pelo email para evitar duplicatas
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.leadEmail },
        select: { id: true },
      });
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    // 4. Create/retrieve Stripe customer using tenant's key
    let customerId: string | undefined;

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripe_customer_id: true },
      });
      customerId = user?.stripe_customer_id ?? undefined;
    }

    if (!customerId) {
      const customer = await this.stripeProvider.createOrRetrieveCustomer({
        email: customerEmail,
        name: customerName,
        metadata: {
          ...(userId ? { userId } : {}),
          tenantId: dto.tenantId,
          ...(dto.leadPhone ? { leadPhone: dto.leadPhone } : {}),
        },
        stripeSecretKey,
      });
      customerId = customer.id;

      // Persiste customerId no user se ele existir
      if (userId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripe_customer_id: customerId },
        });
      }
    }

    // 5. Determine checkout mode based on billing_mode
    const isSubscription = [EBillingMode.UNLIMITED, EBillingMode.LIMITED].includes(
      price.billing_mode as EBillingMode,
    );
    const checkoutMode = isSubscription ? 'subscription' : 'payment';

    // 5b. Validate and apply coupon codes (if provided)
    const couponCodes = dto.couponCodes?.filter(Boolean) ?? [];
    // stripeCouponId is used for BOTH subscription and payment modes.
    // - subscription: attached via subscription_data.coupon
    // - payment:      attached via session discounts[]
    let stripeCouponId: string | undefined;

    if (couponCodes.length > 0) {
      const validationResult = await this.validateCouponUseCase.execute(
        dto.tenantId,
        couponCodes,
        [
          {
            productId: price.Product.id,
            basePrice: price.unit_amount,
            quantity: 1,
            isRecurring: isSubscription,
            itemType: 'b2c',
          },
        ],
        'b2c',
      );

      if (validationResult.totalDiscount > 0) {
        // Claim redemptions atomically before creating the Stripe session
        for (const { code } of validationResult.coupons) {
          const coupon = await this.couponRepo.findByCode(dto.tenantId, code);
          const claimed = await this.couponRepo.incrementRedeemedCount(
            dto.tenantId,
            code,
            coupon?.maxRedemptions ?? null,
          );
          if (!claimed) {
            throw new ConflictException(`Cupom esgotado: ${code}`);
          }
        }

        // For both subscription and payment modes we create a Stripe Coupon.
        // - subscription: applied via subscription_data.coupon (renders on invoice)
        // - payment:      applied via session discounts[] (renders on checkout page)
        // Negative unit_amount in price_data is NOT supported by Stripe Checkout.
        const stripeForCoupon = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
        const stripeCoupon = await stripeForCoupon.coupons.create({
          amount_off: validationResult.totalDiscount,
          currency: price.currency,
          duration: 'once', // discount applies only to the first invoice / payment
          max_redemptions: 1,
          name: `Desconto (${couponCodes.join(', ')})`,
          metadata: { tenant_id: dto.tenantId, coupon_codes: couponCodes.join(',') },
        });
        stripeCouponId = stripeCoupon.id;
      }
    }

    // 6. Build checkout URLs per tenant
    const { successUrl, cancelUrl } = await this.billingConfigRepo.getCheckoutUrls(dto.tenantId);

    // 7. Create checkout session using tenant's key
    const sessionMetadata: Record<string, string> = {
      tenantId: dto.tenantId,
      productId: price.Product.id,
      priceId: dto.priceId,
      billingMode: price.billing_mode,
      maxBillingCycles: price.max_billing_cycles?.toString() || '',
      accessDurationDays: price.access_duration_days?.toString() || '',
      ...(couponCodes.length > 0 ? { coupon_codes: couponCodes.join(',') } : {}),
      ...(stripeCouponId ? { stripe_coupon_id: stripeCouponId } : {}),
      // Lead metadata — webhook usa para criar/vincular user
      ...(userId
        ? { userId }
        : {
            is_lead_purchase: 'true',
            lead_name: customerName,
            lead_email: customerEmail,
            lead_phone: dto.leadPhone ?? '',
          }),
    };

    const subscriptionMetadata: Record<string, string> = {
      tenantId: dto.tenantId,
      productId: price.Product.id,
      billingMode: price.billing_mode,
      maxBillingCycles: price.max_billing_cycles?.toString() || '',
      ...(couponCodes.length > 0 ? { coupon_codes: couponCodes.join(',') } : {}),
      ...(userId ? { userId } : { is_lead_purchase: 'true', lead_email: customerEmail }),
    };

    const session = await this.stripeProvider.createCheckoutSession({
      customerId,
      priceId: price.stripe_price_id,
      mode: checkoutMode,
      successUrl: successUrl.includes('{CHECKOUT_SESSION_ID}')
        ? successUrl
        : `${successUrl}?session_id={CHECKOUT_SESSION_ID}&product=${price.Product.slug}`,
      cancelUrl: cancelUrl.includes(price.Product.slug)
        ? cancelUrl
        : `${cancelUrl}?product=${price.Product.slug}`,
      metadata: sessionMetadata,
      stripeSecretKey,
      // Subscription mode: coupon via subscription_data.coupon (renders on invoice)
      // Payment mode:      coupon via session discounts[] (renders on checkout page)
      ...(stripeCouponId && isSubscription ? { subscriptionCoupon: stripeCouponId } : {}),
      ...(stripeCouponId && !isSubscription ? { sessionCoupon: stripeCouponId } : {}),
      ...(isSubscription ? { subscriptionData: { metadata: subscriptionMetadata } } : {}),
    });

    // 8. Save checkout session as pending for funnel tracking
    await this.checkoutSessionRepo.create({
      tenantId: dto.tenantId,
      userId: userId ?? null,
      productId: price.Product.id,
      priceId: dto.priceId,
      stripeCheckoutId: session.id,
      stripePriceId: price.stripe_price_id,
      amount: price.unit_amount,
      currency: price.currency,
      customerEmail,
      customerName,
      customerPhone: dto.leadPhone ?? null,
      isLeadPurchase: !dto.userId,
    });

    return { checkoutUrl: session.url! };
  }
}
