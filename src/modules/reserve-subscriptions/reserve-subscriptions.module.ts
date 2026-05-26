import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

// Controllers
import { SubscriptionsController } from './infrastructure/controllers/subscriptions.controller';
import { StripeWebhookController } from './infrastructure/controllers/stripe-webhook.controller';
import { TenantBillingConfigController } from './infrastructure/controllers/tenant-billing-config.controller';
import { StripePlansController } from './infrastructure/controllers/stripe-plans.controller';

// Use Cases
import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { GetTenantSubscriptionUseCase } from './application/use-cases/get-tenant-subscription.use-case';
import { GetTenantSubscriptionFromStripeUseCase } from './application/use-cases/get-tenant-subscription-from-stripe.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessStripeWebhookUseCase } from './application/use-cases/process-stripe-webhook.use-case';
import { ManageTenantBillingConfigUseCase } from './application/use-cases/manage-tenant-billing-config.use-case';
import { CreateBillingPortalSessionUseCase } from './application/use-cases/create-billing-portal-session.use-case';
import { CreateStripePlanUseCase } from './application/use-cases/create-stripe-plan.use-case';
import { ArchiveStripePlanUseCase } from './application/use-cases/archive-stripe-plan.use-case';
import { ListStripePlansUseCase } from './application/use-cases/list-stripe-plans.use-case';
import { UpdateStripePlanUseCase } from './application/use-cases/update-stripe-plan.use-case';
import { ListMovementsUseCase } from './application/use-cases/list-movements.use-case';

// Repositories
import { PrismaStripeSubscriptionRepository } from './infrastructure/repositories/prisma-stripe-subscription.repository';
import { PrismaStripeWebhookEventRepository } from './infrastructure/repositories/prisma-stripe-webhook-event.repository';
import { PrismaTenantBillingConfigRepository } from './infrastructure/repositories/prisma-tenant-billing-config.repository';
import { PrismaStripePlanRepository } from './infrastructure/repositories/prisma-stripe-plan.repository';
import { StripeApiPlanRepository } from './infrastructure/repositories/stripe-api-plan.repository';
import { STRIPE_SUBSCRIPTION_REPOSITORY } from './domain/interfaces/stripe-subscription.repository.interface';
import { STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/stripe-webhook-event.repository.interface';
import { TENANT_BILLING_CONFIG_REPOSITORY } from './domain/interfaces/tenant-billing-config.repository.interface';
import { STRIPE_PLAN_REPOSITORY } from './domain/interfaces/stripe-plan.repository.interface';

// Providers
import { StripeProvider } from './infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from './domain/interfaces/stripe.provider.interface';

// Schedulers & Guards
import { StripeWebhookRetryScheduler } from './infrastructure/schedulers/stripe-webhook-retry.scheduler';
import { ActiveSubscriptionGuard } from './infrastructure/guards/active-subscription.guard';

@Module({
  imports: [DatabaseModule, ReserveAuthModule],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    TenantBillingConfigController,
    StripePlansController,
  ],
  providers: [
    // Use Cases
    CreateCheckoutSessionUseCase,
    GetTenantSubscriptionUseCase,
    GetTenantSubscriptionFromStripeUseCase, // NEW: Fetches from Stripe API
    CancelSubscriptionUseCase,
    ProcessStripeWebhookUseCase,
    ManageTenantBillingConfigUseCase,
    CreateBillingPortalSessionUseCase,
    CreateStripePlanUseCase,
    ArchiveStripePlanUseCase,
    ListStripePlansUseCase,
    UpdateStripePlanUseCase,
    ListMovementsUseCase,

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
    {
      provide: STRIPE_PLAN_REPOSITORY,
      useClass: StripeApiPlanRepository, // CHANGED: Now uses Stripe API instead of local DB
    },

    // Providers
    {
      provide: STRIPE_PROVIDER,
      useClass: StripeProvider,
    },

    // Schedulers
    StripeWebhookRetryScheduler,

    // Guards (registered as providers so they can be injected)
    ActiveSubscriptionGuard,
  ],
  exports: [
    STRIPE_SUBSCRIPTION_REPOSITORY,
    TENANT_BILLING_CONFIG_REPOSITORY,
    STRIPE_PLAN_REPOSITORY,
    GetTenantSubscriptionUseCase,
    GetTenantSubscriptionFromStripeUseCase, // Export the new use case
    ManageTenantBillingConfigUseCase,
    ListStripePlansUseCase,
    ActiveSubscriptionGuard,
  ],
})
export class ReserveSubscriptionsModule {}
