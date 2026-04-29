import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/user-subscription.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';
import { EUserSubscriptionStatus } from '../../domain/enums/user-subscription-status.enum';

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepo: IUserSubscriptionRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
  ) {}

  async execute(dto: { tenantId: string; subscriptionId: string; userId: string }): Promise<void> {
    const subscription = await this.userSubscriptionRepo.findById(dto.subscriptionId);

    if (!subscription || subscription.userId !== dto.userId) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === EUserSubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    // Cancel at period end via Stripe
    await this.stripeProvider.cancelSubscription(subscription.stripeSubscriptionId, true);

    // Update local record
    await this.userSubscriptionRepo.updateByStripeSubscriptionId(
      dto.tenantId,
      subscription.stripeSubscriptionId,
      { cancelAtPeriodEnd: true },
    );
  }
}
