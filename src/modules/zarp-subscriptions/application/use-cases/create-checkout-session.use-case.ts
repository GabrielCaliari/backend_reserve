import { Inject, Injectable } from '@nestjs/common';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../domain/interfaces/stripe.provider.interface';
import {
  IStripeSubscriptionRepository,
  STRIPE_SUBSCRIPTION_REPOSITORY,
} from '../../domain/interfaces/stripe-subscription.repository.interface';
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
  ) {}

  async execute(dto: CreateCheckoutSessionDTO): Promise<CreateCheckoutSessionResult> {
    // Check if tenant already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveByTenantId(
      dto.tenantId,
    );

    if (existingSubscription) {
      throw new Error('Tenant already has an active subscription');
    }

    // Create checkout session
    const session = await this.stripeProvider.createCheckoutSession({
      priceId: dto.priceId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      trialPeriodDays: dto.trialPeriodDays,
      metadata: {
        tenantId: dto.tenantId,
        ...dto.metadata,
      },
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }
}
