import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpB2cProductsModule } from '../zarp-b2c-products/zarp-b2c-products.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';

import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { ListMySubscriptionsUseCase } from './application/use-cases/list-my-subscriptions.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessB2CWebhookUseCase } from './application/use-cases/process-b2c-webhook.use-case';

import { PrismaUserSubscriptionRepository } from './infrastructure/repositories/prisma-user-subscription.repository';
import { PrismaB2CStripeWebhookEventRepository } from './infrastructure/repositories/prisma-b2c-stripe-webhook-event.repository';
import { USER_SUBSCRIPTION_REPOSITORY } from './domain/interfaces/user-subscription.repository.interface';
import { B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/b2c-stripe-webhook-event.repository.interface';

import { StripeProvider } from '../zarp-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

import { SubscriptionAccessGuard } from './infrastructure/guards/subscription-access.guard';
import { B2CSubscriptionsController } from './infrastructure/controllers/b2c-subscriptions.controller';
import { B2CStripeWebhookController } from './infrastructure/controllers/b2c-stripe-webhook.controller';

@Module({
  imports: [DatabaseModule, ZarpAuthModule, ZarpB2cProductsModule, ZarpSubscriptionsModule],
  controllers: [B2CSubscriptionsController, B2CStripeWebhookController],
  providers: [
    CreateCheckoutSessionUseCase,
    ListMySubscriptionsUseCase,
    CancelSubscriptionUseCase,
    ProcessB2CWebhookUseCase,
    { provide: USER_SUBSCRIPTION_REPOSITORY, useClass: PrismaUserSubscriptionRepository },
    {
      provide: B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaB2CStripeWebhookEventRepository,
    },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
    SubscriptionAccessGuard,
  ],
  exports: [SubscriptionAccessGuard, USER_SUBSCRIPTION_REPOSITORY],
})
export class ZarpB2cSubscriptionsModule {}
