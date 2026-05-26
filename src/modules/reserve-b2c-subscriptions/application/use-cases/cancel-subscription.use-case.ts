import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  async execute(dto: { tenantId: string; accessId: string; userId: string }): Promise<void> {
    const access = await this.accessRepo.findByUserId(dto.userId);
    const userAccess = access.find((a) => a.id === dto.accessId);

    if (!userAccess || userAccess.user_id !== dto.userId) {
      throw new NotFoundException('Access not found');
    }

    if (userAccess.status === 'canceled') {
      throw new BadRequestException('Access is already canceled');
    }

    if (!userAccess.stripe_subscription_id) {
      throw new BadRequestException('Cannot cancel one-time payment access');
    }

    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(dto.tenantId);

    // Cancel at period end via Stripe
    await this.stripeProvider.cancelSubscription(
      userAccess.stripe_subscription_id,
      true,
      stripeSecretKey,
    );

    // Update local record
    await this.accessRepo.update(userAccess.id, {
      cancel_at_period_end: true,
    });
  }
}

