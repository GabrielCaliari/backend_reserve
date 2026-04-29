import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: {
    tenantId: string;
    userId: string;
    priceId: string;
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

    // 3. Check if user already has active subscription for this product
    const alreadySubscribed = await this.userSubscriptionRepo.hasActiveSubscription(
      dto.userId,
      price.Product.slug,
    );

    if (alreadySubscribed) {
      throw new ConflictException('You already have an active subscription for this product');
    }

    // 4. Load user and create/retrieve Stripe customer using tenant's key
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeProvider.createOrRetrieveCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId: dto.userId, tenantId: dto.tenantId },
        stripeSecretKey,
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { stripe_customer_id: customerId },
      });
    }

    // 5. Create checkout session using tenant's key
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeProvider.createCheckoutSession({
      customerId,
      priceId: price.stripe_price_id,
      successUrl: `${frontendUrl}/dashboard?checkout=success&product=${price.Product.slug}`,
      cancelUrl: `${frontendUrl}/products/${price.Product.slug}?checkout=canceled`,
      metadata: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        productId: price.Product.id,
        priceId: dto.priceId,
      },
      stripeSecretKey,
    });

    return { checkoutUrl: session.url! };
  }
}
