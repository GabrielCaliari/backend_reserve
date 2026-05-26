import { Inject, Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../domain/interfaces/stripe.provider.interface';
import {
  IStripeSubscriptionRepository,
  STRIPE_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/stripe-subscription.repository.interface';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';
import { CreateCheckoutSessionDTO } from '../dtos/create-checkout-session.dto';

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(STRIPE_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: IStripeSubscriptionRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(dto: CreateCheckoutSessionDTO): Promise<CreateCheckoutSessionResult> {
    // Check if tenant already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveByTenantId(
      dto.tenantId,
    );

    if (existingSubscription) {
      throw new ConflictException('Tenant already has an active subscription');
    }

    // Resolve the Stripe secret key — required per-tenant (no global fallback)
    const tenantSecretKey = await this.billingConfigRepository.getStripeSecretKey(dto.tenantId);

    if (!tenantSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config with stripeSecretKey.',
      );
    }

    // Create checkout session using the tenant's key
    const session = await this.stripeProvider.createCheckoutSession({
      priceId: dto.priceId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      trialPeriodDays: dto.trialPeriodDays,
      metadata: {
        tenantId: dto.tenantId,
        ...dto.metadata,
      },
      stripeSecretKey: tenantSecretKey,
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL. Check the price ID and Stripe configuration.');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }
}
