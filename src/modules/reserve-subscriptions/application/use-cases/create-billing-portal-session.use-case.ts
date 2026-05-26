import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

export interface CreateBillingPortalSessionDTO {
  tenantId: string;
  returnUrl: string;
}

export interface CreateBillingPortalSessionResult {
  portalUrl: string;
  sessionId: string;
}

/**
 * Creates a Stripe Billing Portal session for the tenant's customer.
 *
 * The Billing Portal allows the customer to:
 * - Update payment methods
 * - View and download invoices
 * - Cancel or modify their subscription
 *
 * Requires the tenant to have an active subscription with a stripe_customer_id.
 */
@Injectable()
export class CreateBillingPortalSessionUseCase {
  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(STRIPE_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: IStripeSubscriptionRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(
    dto: CreateBillingPortalSessionDTO,
  ): Promise<CreateBillingPortalSessionResult> {
    // Find the tenant's subscription to get the stripe_customer_id
    const subscription = await this.subscriptionRepository.findByTenantId(dto.tenantId);

    if (!subscription) {
      throw new NotFoundException(
        'No subscription found for this tenant. ' +
          'The tenant must complete a checkout before accessing the billing portal.',
      );
    }

    if (!subscription.stripeCustomerId) {
      throw new BadRequestException(
        'Subscription does not have a Stripe customer ID. ' +
          'This may indicate an incomplete checkout flow.',
      );
    }

    // Resolve per-tenant Stripe secret key — required (no global fallback)
    const tenantSecretKey = await this.billingConfigRepository.getStripeSecretKey(dto.tenantId);

    if (!tenantSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config with stripeSecretKey.',
      );
    }

    const portalSession = await this.stripeProvider.createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: dto.returnUrl,
      stripeSecretKey: tenantSecretKey,
    });

    return {
      portalUrl: portalSession.url,
      sessionId: portalSession.id,
    };
  }
}
