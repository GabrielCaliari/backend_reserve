import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';

// Controllers
import { SubscriptionsController } from './infrastructure/controllers/subscriptions.controller';
import { StripeWebhookController } from './infrastructure/controllers/stripe-webhook.controller';

// Use Cases
import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { GetTenantSubscriptionUseCase } from './application/use-cases/get-tenant-subscription.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessStripeWebhookUseCase } from './application/use-cases/process-stripe-webhook.use-case';

// Repositories
import { PrismaStripeSubscriptionRepository } from './infrastructure/repositories/prisma-stripe-subscription.repository';
import { PrismaStripeWebhookEventRepository } from './infrastructure/repositories/prisma-stripe-webhook-event.repository';
import { STRIPE_SUBSCRIPTION_REPOSITORY } from './domain/interfaces/stripe-subscription.repository.interface';
import { STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/stripe-webhook-event.repository.interface';

// Providers
import { StripeProvider } from './infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from './domain/interfaces/stripe.provider.interface';

@Module({
  imports: [DatabaseModule],
  controllers: [SubscriptionsController, StripeWebhookController],
  providers: [
    // Use Cases
    CreateCheckoutSessionUseCase,
    GetTenantSubscriptionUseCase,
    CancelSubscriptionUseCase,
    ProcessStripeWebhookUseCase,

    // Repositories
    {
      provide: STRIPE_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaStripeSubscriptionRepository,
    },
    {
      provide: STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaStripeWebhookEventRepository,
    },

    // Providers
    {
      provide: STRIPE_PROVIDER,
      useClass: StripeProvider,
    },
    StripeProvider, // Also provide as concrete class for webhook controller
  ],
  exports: [
    STRIPE_SUBSCRIPTION_REPOSITORY,
    GetTenantSubscriptionUseCase,
  ],
})
export class ZarpSubscriptionsModule {}
