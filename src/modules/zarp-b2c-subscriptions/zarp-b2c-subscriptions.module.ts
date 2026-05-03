import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpB2cProductsModule } from '../zarp-b2c-products/zarp-b2c-products.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';

import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { ListMySubscriptionsUseCase } from './application/use-cases/list-my-subscriptions.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessB2CWebhookUseCase } from './application/use-cases/process-b2c-webhook.use-case';
import { ExpireTemporaryAccessUseCase } from './application/use-cases/expire-temporary-access.use-case';

import { PrismaUserProductAccessRepository } from './infrastructure/repositories/prisma-user-product-access.repository';
import { PrismaB2CStripeWebhookEventRepository } from './infrastructure/repositories/prisma-b2c-stripe-webhook-event.repository';
import { USER_PRODUCT_ACCESS_REPOSITORY } from './domain/interfaces/user-product-access.repository.interface';
import { B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/b2c-stripe-webhook-event.repository.interface';

import { StripeProvider } from '../zarp-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

import { ProductAccessGuard } from './infrastructure/guards/product-access.guard';
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
    ExpireTemporaryAccessUseCase,
    { provide: USER_PRODUCT_ACCESS_REPOSITORY, useClass: PrismaUserProductAccessRepository },
    {
      provide: B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaB2CStripeWebhookEventRepository,
    },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
    ProductAccessGuard,
  ],
  exports: [ProductAccessGuard, USER_PRODUCT_ACCESS_REPOSITORY, ProcessB2CWebhookUseCase],
})
export class ZarpB2cSubscriptionsModule {}

