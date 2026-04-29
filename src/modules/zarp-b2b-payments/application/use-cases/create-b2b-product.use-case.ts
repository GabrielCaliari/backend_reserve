import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';
import { CreateB2BProductDTO } from '../dtos/create-b2b-product.dto';

@Injectable()
export class CreateB2BProductUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  async execute(tenantId: string, dto: CreateB2BProductDTO): Promise<B2BProductEntity> {
    const currency = dto.currency ?? 'brl';

    // 1. Get tenant's Stripe secret key
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. Configure it via billing config.',
      );
    }

    // 2. Create product in Stripe using tenant's key
    const stripeProduct = await this.stripeProvider.createProduct({
      name: dto.name,
      description: dto.description,
      metadata: { tenant_id: tenantId },
      stripeSecretKey,
    });

    // 3. Create one-time price in Stripe using tenant's key
    const stripePrice = await this.stripeProvider.createOneTimePrice({
      productId: stripeProduct.id,
      unitAmount: dto.price,
      currency,
      metadata: { tenant_id: tenantId },
      stripeSecretKey,
    });

    // 4. Persist in DB
    return this.productRepo.create({
      tenantId,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency,
    });
  }
}
