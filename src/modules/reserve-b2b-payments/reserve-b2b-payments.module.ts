import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { ReserveSubscriptionsModule } from '../reserve-subscriptions/reserve-subscriptions.module';
import { ReserveB2cProductsModule } from '../reserve-b2c-products/reserve-b2c-products.module';
import { ReserveCouponsModule } from '../reserve-coupons/reserve-coupons.module';

import { B2BPaymentsController } from './infrastructure/controllers/b2b-payments.controller';
import { B2BWebhookController } from './infrastructure/controllers/b2b-webhook.controller';
import { PublicB2BProductsController, PublicB2BCartController } from './infrastructure/controllers/public-b2b-products.controller';
import { AdminB2BFeesController } from './infrastructure/controllers/admin-b2b-fees.controller';

import { CreateB2BProductUseCase } from './application/use-cases/create-b2b-product.use-case';
import { ListB2BProductsUseCase } from './application/use-cases/list-b2b-products.use-case';
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case';
import { CreateLeadCheckoutUseCase } from './application/use-cases/create-lead-checkout.use-case';
import { CreateCartCheckoutUseCase } from './application/use-cases/create-cart-checkout.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetMetricsUseCase } from './application/use-cases/get-metrics.use-case';
import { ProcessB2BWebhookUseCase } from './application/use-cases/process-b2b-webhook.use-case';
import { CalculateB2BOrderCostUseCase } from './application/use-cases/calculate-b2b-order-cost.use-case';
import { ManageB2BProductFeesUseCase } from './application/use-cases/manage-b2b-product-fees.use-case';

import { PrismaB2BProductRepository } from './infrastructure/repositories/prisma-b2b-product.repository';
import { PrismaB2BPurchaseRepository } from './infrastructure/repositories/prisma-b2b-purchase.repository';
import { PrismaB2BFeeConfigRepository } from './infrastructure/repositories/prisma-b2b-fee-config.repository';
import { B2B_PRODUCT_REPOSITORY } from './domain/interfaces/b2b-product.repository.interface';
import { B2B_PURCHASE_REPOSITORY } from './domain/interfaces/b2b-purchase.repository.interface';
import { B2B_FEE_CONFIG_REPOSITORY } from './domain/interfaces/b2b-fee-config.repository.interface';

import { StripeProvider } from '../reserve-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../reserve-subscriptions/domain/interfaces/stripe.provider.interface';

import { OptionalUserGuard } from './infrastructure/guards/optional-user.guard';

@Module({
  imports: [DatabaseModule, ReserveAuthModule, ReserveSubscriptionsModule, ReserveB2cProductsModule, ReserveCouponsModule],
  controllers: [
    B2BPaymentsController,
    B2BWebhookController,
    PublicB2BProductsController,
    PublicB2BCartController,
    AdminB2BFeesController,
  ],
  providers: [
    CreateB2BProductUseCase,
    ListB2BProductsUseCase,
    CreatePaymentLinkUseCase,
    CreateLeadCheckoutUseCase,
    CreateCartCheckoutUseCase,
    ListPurchasesUseCase,
    GetMetricsUseCase,
    ProcessB2BWebhookUseCase,
    CalculateB2BOrderCostUseCase,
    ManageB2BProductFeesUseCase,
    OptionalUserGuard,
    { provide: B2B_PRODUCT_REPOSITORY, useClass: PrismaB2BProductRepository },
    { provide: B2B_PURCHASE_REPOSITORY, useClass: PrismaB2BPurchaseRepository },
    { provide: B2B_FEE_CONFIG_REPOSITORY, useClass: PrismaB2BFeeConfigRepository },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
  ],
  exports: [ProcessB2BWebhookUseCase],
})
export class ReserveB2bPaymentsModule {}
