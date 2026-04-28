import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';
import {
  IProductPriceRepository,
  PRODUCT_PRICE_REPOSITORY,
} from '../../../zarp-b2c-products/domain/interfaces/product-price.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    @Inject(PRODUCT_PRICE_REPOSITORY)
    private readonly productPriceRepo: IProductPriceRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: {
    userId: string;
    priceId: string;
  }): Promise<{ checkoutUrl: string }> {
    // 1. Validate price exists and is active
    const price = await this.prisma.productPrice.findUnique({
      where: { id: dto.priceId },
      include: { Product: true },
    });

    if (!price || !price.active || !price.Product.active) {
      throw new NotFoundException('Price not found or inactive');
    }

    // 2. Check if user already has active subscription for this product
    const alreadySubscribed = await this.userSubscriptionRepo.hasActiveSubscription(
      dto.userId,
      price.Product.slug,
    );

    if (alreadySubscribed) {
      throw new ConflictException('You already have an active subscription for this product');
    }

    // 3. Load user and create/retrieve Stripe customer
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeProvider.createOrRetrieveCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId: dto.userId },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { stripe_customer_id: customerId },
      });
    }

    // 4. Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const session = await this.stripeProvider.createCheckoutSession({
      customerId,
      priceId: price.stripe_price_id,
      successUrl: `${frontendUrl}/dashboard?checkout=success&product=${price.Product.slug}`,
      cancelUrl: `${frontendUrl}/products/${price.Product.slug}?checkout=canceled`,
      metadata: {
        userId: dto.userId,
        productId: price.Product.id,
        priceId: dto.priceId,
      },
    });

    return { checkoutUrl: session.url! };
  }
}
