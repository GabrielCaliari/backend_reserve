import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';

// Controllers
import { SubscriptionsController } from './infrastructure/controllers/subscriptions.controller';
import { StripeWebhookController } from './infrastructure/controllers/stripe-webhook.controller';
import { TenantBillingConfigController } from './infrastructure/controllers/tenant-billing-config.controller';

// Use Cases
import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { GetTenantSubscriptionUseCase } from './application/use-cases/get-tenant-subscription.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessStripeWebhookUseCase } from './application/use-cases/process-stripe-webhook.use-case';
import { ManageTenantBillingConfigUseCase } from './application/use-cases/manage-tenant-billing-config.use-case';

// Repositories
import { PrismaStripeSubscriptionRepository } from './infrastructure/repositories/prisma-stripe-subscription.repository';
import { PrismaStripeWebhookEventRepository } from './infrastructure/repositories/prisma-stripe-webhook-event.repository';
import { PrismaTenantBillingConfigRepository } from './infrastructure/repositories/prisma-tenant-billing-config.repository';
import { STRIPE_SUBSCRIPTION_REPOSITORY } from './domain/interfaces/stripe-subscription.repository.interface';
import { STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/stripe-webhook-event.repository.interface';
import { TENANT_BILLING_CONFIG_REPOSITORY } from './domain/interfaces/tenant-billing-config.repository.interface';

// Providers
import { StripeProvider } from './infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from './domain/interfaces/stripe.provider.interface';

@Module({
  imports: [DatabaseModule, ZarpAuthModule],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    TenantBillingConfigController,
  ],
  providers: [
    // Use Cases
    CreateCheckoutSessionUseCase,
    GetTenantSubscriptionUseCase,
    CancelSubscriptionUseCase,
    ProcessStripeWebhookUseCase,
    ManageTenantBillingConfigUseCase,

    // Repositories
    {
      provide: STRIPE_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaStripeSubscriptionRepository,
    },
    {
      provide: STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaStripeWebhookEventRepository,
    },
    {
      provide: TENANT_BILLING_CONFIG_REPOSITORY,
      useClass: PrismaTenantBillingConfigRepository,
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
    TENANT_BILLING_CONFIG_REPOSITORY,
    GetTenantSubscriptionUseCase,
    ManageTenantBillingConfigUseCase,
  ],
})
export class ZarpSubscriptionsModule {}
