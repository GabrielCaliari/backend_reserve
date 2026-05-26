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
import { CancelSubscriptionDTO } from '../dtos/cancel-subscription.dto';

export interface CancelSubscriptionResult {
  message: string;
  cancelAtPeriodEnd: boolean;
  accessUntil?: Date;
}

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(STRIPE_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: IStripeSubscriptionRepository,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  async execute(
    subscriptionId: string,
    dto: CancelSubscriptionDTO,
  ): Promise<CancelSubscriptionResult> {
    // Find subscription
    const subscription = await this.subscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.isActive()) {
      throw new BadRequestException('Subscription is not active');
    }

    // Resolve the Stripe secret key — required per-tenant (no global fallback)
    const tenantSecretKey = await this.billingConfigRepository.getStripeSecretKey(
      subscription.tenantId,
    );

    if (!tenantSecretKey) {
      throw new BadRequestException(
        'Stripe secret key not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config with stripeSecretKey.',
      );
    }

    // Cancel in Stripe
    const cancelAtPeriodEnd = !dto.cancelImmediately;
    await this.stripeProvider.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd,
      tenantSecretKey,
    );

    // Update local subscription
    if (dto.cancelImmediately) {
      subscription.cancelImmediately();
    } else {
      subscription.cancelAtPeriodEndAction();
    }

    await this.subscriptionRepository.update(subscription);

    return {
      message: dto.cancelImmediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the current period',
      cancelAtPeriodEnd,
      accessUntil: cancelAtPeriodEnd ? subscription.currentPeriodEnd : undefined,
    };
  }
}
