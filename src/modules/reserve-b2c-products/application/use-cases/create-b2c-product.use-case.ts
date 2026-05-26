import { Injectable, Inject, BadRequestException, ConflictException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/interfaces/product.repository.interface';
import {
  IProductPriceRepository,
  PRODUCT_PRICE_REPOSITORY,
} from '../../domain/interfaces/product-price.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../reserve-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../reserve-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { CreateB2CProductDTO } from '../dtos/create-b2c-product.dto';

// Map 'quarter' to Stripe's month interval with intervalCount=3
const INTERVAL_MAP: Record<string, { interval: 'month' | 'year' | 'week'; intervalCount: number }> = {
  month: { interval: 'month', intervalCount: 1 },
  year: { interval: 'year', intervalCount: 1 },
  week: { interval: 'week', intervalCount: 1 },
  quarter: { interval: 'month', intervalCount: 3 },
};

@Injectable()
export class CreateB2CProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
    @Inject(PRODUCT_PRICE_REPOSITORY)
    private readonly priceRepo: IProductPriceRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  async execute(tenantId: string, dto: CreateB2CProductDTO): Promise<ProductEntity> {
    const currency = dto.currency ?? 'brl';

    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. Configure it via billing config.',
      );
    }

    // 2. Check slug uniqueness
    const existing = await this.productRepo.findBySlug(tenantId, dto.slug);
    if (existing) {
      throw new ConflictException(`A product with slug "${dto.slug}" already exists.`);
    }

    // 3. Create product in Stripe using tenant's key
    const stripeProduct = await this.stripeProvider.createProduct({
      name: dto.name,
      description: dto.description,
      metadata: { tenant_id: tenantId, slug: dto.slug },
      stripeSecretKey,
    });

    // 4. Map interval (quarter → month x3)
    const intervalConfig = INTERVAL_MAP[dto.interval] ?? { interval: dto.interval as any, intervalCount: dto.intervalCount };
    const resolvedIntervalCount = dto.interval === 'quarter' ? 3 : dto.intervalCount;

    // 5. Create recurring price in Stripe using tenant's key
    const stripePrice = await this.stripeProvider.createPrice({
      productId: stripeProduct.id,
      unitAmount: dto.unitAmount,
      currency,
      interval: intervalConfig.interval,
      intervalCount: resolvedIntervalCount,
      metadata: { tenant_id: tenantId, slug: dto.slug },
      stripeSecretKey,
    });

    // 6. Persist product in DB
    const product = await this.productRepo.create({
      tenantId,
      stripeProductId: stripeProduct.id,
      name: dto.name,
      description: dto.description,
      slug: dto.slug,
      categories: dto.categories,
      requiresShipping: dto.requiresShipping ?? false,
    });

    // 7. Persist price in DB
    await this.priceRepo.create({
      tenantId,
      productId: product.id,
      stripePriceId: stripePrice.id,
      interval: intervalConfig.interval,
      intervalCount: resolvedIntervalCount,
      unitAmount: dto.unitAmount,
      currency,
    });

    // 8. Return product with price included
    return (await this.productRepo.findById(product.id, tenantId)) ?? product;
  }
}
