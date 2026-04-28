import {
  Inject,
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../domain/interfaces/stripe.provider.interface';
import {
  IStripePlanRepository,
  STRIPE_PLAN_REPOSITORY,
} from '../../domain/interfaces/stripe-plan.repository.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';
import { StripePlanEntity } from '../../domain/entities/stripe-plan.entity';
import { CreateStripePlanDTO, BILLING_INTERVAL_MAP } from '../dtos/stripe-plan.dto';

@Injectable()
export class CreateStripePlanUseCase {
  private readonly logger = new Logger(CreateStripePlanUseCase.name);

  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(STRIPE_PLAN_REPOSITORY)
    private readonly planRepository: IStripePlanRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(dto: CreateStripePlanDTO): Promise<StripePlanEntity> {
    // 1. Resolve the tenant's Stripe secret key — no global fallback
    const tenantSecretKey = await this.billingConfigRepository.getStripeSecretKey(dto.tenant_id);
    if (!tenantSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config with stripeSecretKey.',
      );
    }

    // 2. Ensure slug is unique
    const existing = await this.planRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`A plan with slug "${dto.slug}" already exists.`);
    }

    // 3. Create product in Stripe using the tenant's key
    this.logger.log(`Creating Stripe product for plan "${dto.slug}" (tenant: ${dto.tenant_id})`);
    const stripeProduct = await this.stripeProvider.createProduct({
      name: dto.plan_name,
      description: dto.description,
      metadata: { slug: dto.slug, tenantId: dto.tenant_id },
      stripeSecretKey: tenantSecretKey,
    });

    // 4. Map billing_interval to Stripe interval
    const intervalConfig = BILLING_INTERVAL_MAP[dto.billing_interval];
    if (!intervalConfig) {
      throw new BadRequestException(
        `Invalid billing_interval "${dto.billing_interval}". Must be 1 (weekly), 2 (monthly), 3 (quarterly) or 4 (annual).`,
      );
    }

    // 5. Create recurring price in Stripe using the tenant's key
    this.logger.log(`Creating Stripe recurring price for product ${stripeProduct.id}`);
    const stripePrice = await this.stripeProvider.createPrice({
      productId: stripeProduct.id,
      unitAmount: dto.unit_amount,
      currency: dto.currency,
      interval: intervalConfig.interval,
      intervalCount: intervalConfig.intervalCount,
      metadata: { slug: dto.slug, type: 'recurring', tenantId: dto.tenant_id },
      stripeSecretKey: tenantSecretKey,
    });

    // 6. Create trial price if configured (free trial — R$ 0)
    let trialPriceId: string | undefined;
    const trialDays = dto.trial_days ?? 0;
    const trialCredits = dto.credits_released_trial_period ?? 0;

    if (trialDays > 0 && trialCredits > 0) {
      this.logger.log(`Creating Stripe trial price for product ${stripeProduct.id}`);
      const trialPrice = await this.stripeProvider.createPrice({
        productId: stripeProduct.id,
        unitAmount: 0,
        currency: dto.currency,
        interval: 'day',
        intervalCount: trialDays,
        metadata: { slug: dto.slug, type: 'trial', tenantId: dto.tenant_id },
        stripeSecretKey: tenantSecretKey,
      });
      trialPriceId = trialPrice.id;
    }

    // 7. Persist locally
    const plan = await this.planRepository.create({
      slug: dto.slug,
      planName: dto.plan_name,
      description: dto.description,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      stripeTrialPriceId: trialPriceId,
      billingInterval: dto.billing_interval,
      unitAmount: dto.unit_amount,
      currency: dto.currency,
      releasedCredits: dto.released_credits,
      creditsReleasedTrialPeriod: trialCredits,
      guestLimit: dto.guest_limit ?? 0,
      trialDays,
      active: true,
    });

    this.logger.log(
      `Plan "${dto.slug}" created — Stripe product: ${stripeProduct.id}, price: ${stripePrice.id}`,
    );
    return plan;
  }
}
