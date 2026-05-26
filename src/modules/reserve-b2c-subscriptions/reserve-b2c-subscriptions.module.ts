import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { ReserveB2cProductsModule } from '../reserve-b2c-products/reserve-b2c-products.module';
import { ReserveSubscriptionsModule } from '../reserve-subscriptions/reserve-subscriptions.module';
import { ReserveCouponsModule } from '../reserve-coupons/reserve-coupons.module';
import { ReserveLicensefixModule } from '../reserve-licensefix/reserve-licensefix.module';

import { CreateCheckoutSessionUseCase } from './application/use-cases/create-checkout-session.use-case';
import { ListMySubscriptionsUseCase } from './application/use-cases/list-my-subscriptions.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ProcessB2CWebhookUseCase } from './application/use-cases/process-b2c-webhook.use-case';
import { ExpireTemporaryAccessUseCase } from './application/use-cases/expire-temporary-access.use-case';
import { ListB2CAccessesUseCase } from './application/use-cases/list-b2c-accesses.use-case';

import { PrismaUserProductAccessRepository } from './infrastructure/repositories/prisma-user-product-access.repository';
import { PrismaB2CStripeWebhookEventRepository } from './infrastructure/repositories/prisma-b2c-stripe-webhook-event.repository';
import { PrismaB2CCheckoutSessionRepository } from './infrastructure/repositories/prisma-b2c-checkout-session.repository';
import { USER_PRODUCT_ACCESS_REPOSITORY } from './domain/interfaces/user-product-access.repository.interface';
import { B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY } from './domain/interfaces/b2c-stripe-webhook-event.repository.interface';
import { B2C_CHECKOUT_SESSION_REPOSITORY } from './domain/interfaces/b2c-checkout-session.repository.interface';

import { StripeProvider } from '../reserve-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../reserve-subscriptions/domain/interfaces/stripe.provider.interface';

import { ProductAccessGuard } from './infrastructure/guards/product-access.guard';
import { OptionalUserGuard } from '../reserve-b2b-payments/infrastructure/guards/optional-user.guard';
import { B2CSubscriptionsController } from './infrastructure/controllers/b2c-subscriptions.controller';
import { B2CStripeWebhookController } from './infrastructure/controllers/b2c-stripe-webhook.controller';

@Module({
  imports: [DatabaseModule, ReserveAuthModule, ReserveB2cProductsModule, ReserveSubscriptionsModule, ReserveCouponsModule, ReserveLicensefixModule],
  controllers: [B2CSubscriptionsController, B2CStripeWebhookController],
  providers: [
    CreateCheckoutSessionUseCase,
    ListMySubscriptionsUseCase,
    CancelSubscriptionUseCase,
    ProcessB2CWebhookUseCase,
    ExpireTemporaryAccessUseCase,
    ListB2CAccessesUseCase,
    { provide: USER_PRODUCT_ACCESS_REPOSITORY, useClass: PrismaUserProductAccessRepository },
    {
      provide: B2C_STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaB2CStripeWebhookEventRepository,
    },
    {
      provide: B2C_CHECKOUT_SESSION_REPOSITORY,
      useClass: PrismaB2CCheckoutSessionRepository,
    },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
    ProductAccessGuard,
    OptionalUserGuard, // Permite checkout sem login (leads)
  ],
  exports: [ProductAccessGuard, USER_PRODUCT_ACCESS_REPOSITORY, ProcessB2CWebhookUseCase],
})
export class ReserveB2cSubscriptionsModule {}

