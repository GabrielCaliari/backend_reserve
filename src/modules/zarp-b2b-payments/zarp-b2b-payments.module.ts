import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';

import { B2BPaymentsController } from './infrastructure/controllers/b2b-payments.controller';
import { B2BWebhookController } from './infrastructure/controllers/b2b-webhook.controller';

import { CreateB2BProductUseCase } from './application/use-cases/create-b2b-product.use-case';
import { ListB2BProductsUseCase } from './application/use-cases/list-b2b-products.use-case';
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetMetricsUseCase } from './application/use-cases/get-metrics.use-case';
import { ProcessB2BWebhookUseCase } from './application/use-cases/process-b2b-webhook.use-case';

import { PrismaB2BProductRepository } from './infrastructure/repositories/prisma-b2b-product.repository';
import { PrismaB2BPurchaseRepository } from './infrastructure/repositories/prisma-b2b-purchase.repository';
import { B2B_PRODUCT_REPOSITORY } from './domain/interfaces/b2b-product.repository.interface';
import { B2B_PURCHASE_REPOSITORY } from './domain/interfaces/b2b-purchase.repository.interface';

import { StripeProvider } from '../zarp-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

@Module({
  imports: [DatabaseModule, ZarpAuthModule, ZarpSubscriptionsModule],
  controllers: [B2BPaymentsController, B2BWebhookController],
  providers: [
    CreateB2BProductUseCase,
    ListB2BProductsUseCase,
    CreatePaymentLinkUseCase,
    ListPurchasesUseCase,
    GetMetricsUseCase,
    ProcessB2BWebhookUseCase,
    { provide: B2B_PRODUCT_REPOSITORY, useClass: PrismaB2BProductRepository },
    { provide: B2B_PURCHASE_REPOSITORY, useClass: PrismaB2BPurchaseRepository },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
  ],
})
export class ZarpB2bPaymentsModule {}
