import { Inject, Injectable } from '@nestjs/common';
import {
  IStripeSubscriptionRepository,
  STRIPE_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/stripe-subscription.repository.interface';
import { SubscriptionResponseDTO } from '../dtos/subscription-response.dto';

@Injectable()
export class GetTenantSubscriptionUseCase {
  constructor(
    @Inject(STRIPE_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: IStripeSubscriptionRepository,
  ) {}

  async execute(tenantId: string): Promise<SubscriptionResponseDTO | null> {
    const subscription = await this.subscriptionRepository.findByTenantId(tenantId);

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripePriceId: subscription.stripePriceId,
      stripeProductId: subscription.stripeProductId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      canceledAt: subscription.canceledAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      amount: subscription.amount,
      formattedAmount: subscription.getFormattedAmount(),
      currency: subscription.currency,
      interval: subscription.interval,
      intervalCount: subscription.intervalCount,
      daysRemaining: subscription.getDaysRemaining(),
      isActive: subscription.isActive(),
      isInTrial: subscription.isInTrial(),
      metadata: subscription.metadata,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
