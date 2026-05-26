import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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

@Injectable()
export class ArchiveStripePlanUseCase {
  private readonly logger = new Logger(ArchiveStripePlanUseCase.name);

  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(STRIPE_PLAN_REPOSITORY)
    private readonly planRepository: IStripePlanRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(planId: string, tenantId: string): Promise<{ archived: boolean }> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan "${planId}" not found.`);
    }

    // Resolve the tenant's Stripe secret key
    const tenantSecretKey = await this.billingConfigRepository.getStripeSecretKey(tenantId);
    if (!tenantSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config with stripeSecretKey.',
      );
    }

    // Archive in Stripe — never delete, preserves billing history
    this.logger.log(`Archiving Stripe product ${plan.stripeProductId} for plan "${plan.slug}"`);
    await this.stripeProvider.archiveProduct(plan.stripeProductId, tenantSecretKey);

    this.logger.log(`Archiving Stripe price ${plan.stripePriceId}`);
    await this.stripeProvider.archivePrice(plan.stripePriceId, tenantSecretKey);

    if (plan.stripeTrialPriceId) {
      this.logger.log(`Archiving Stripe trial price ${plan.stripeTrialPriceId}`);
      await this.stripeProvider.archivePrice(plan.stripeTrialPriceId, tenantSecretKey);
    }

    // Mark as inactive locally
    await this.planRepository.update(planId, { active: false });

    this.logger.log(`Plan "${plan.slug}" archived successfully`);
    return { archived: true };
  }
}
