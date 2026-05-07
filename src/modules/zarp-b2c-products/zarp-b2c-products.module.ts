import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';
import { ZarpB2bPaymentsModule } from '../zarp-b2b-payments/zarp-b2b-payments.module';

// Controllers
import { ProductsController } from './infrastructure/controllers/products.controller';
import { AdminProductsController } from './infrastructure/controllers/admin-products.controller';
import { AdminFeeConfigController } from './infrastructure/controllers/admin-fee-config.controller';
import { PublicB2CProductsController } from './infrastructure/controllers/public-b2c-products.controller';
import { PublicUnifiedCheckoutController } from './infrastructure/controllers/public-unified-checkout.controller';

// Use Cases
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { AdminListProductsUseCase } from './application/use-cases/admin-list-products.use-case';
import { CreateB2CProductUseCase } from './application/use-cases/create-b2c-product.use-case';
import { CalculateOrderCostUseCase } from './application/use-cases/calculate-order-cost.use-case';
import { ResolveProductFeesUseCase } from './application/use-cases/resolve-product-fees.use-case';
import { ManageFeeConfigUseCase } from './application/use-cases/manage-fee-config.use-case';
import { UnifiedCalculateCostUseCase } from './application/use-cases/unified-calculate-cost.use-case';
import { UnifiedCheckoutUseCase } from './application/use-cases/unified-checkout.use-case';

// Repositories
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { PrismaProductPriceRepository } from './infrastructure/repositories/prisma-product-price.repository';
import { PrismaProductCategoryRepository } from './infrastructure/repositories/prisma-product-category.repository';
import { PrismaB2CFeeConfigRepository } from './infrastructure/repositories/prisma-b2c-fee-config.repository';

// Tokens
import { PRODUCT_REPOSITORY } from './domain/interfaces/product.repository.interface';
import { PRODUCT_PRICE_REPOSITORY } from './domain/interfaces/product-price.repository.interface';
import { PRODUCT_CATEGORY_REPOSITORY } from './domain/interfaces/product-category.repository.interface';
import { B2C_FEE_CONFIG_REPOSITORY } from './domain/interfaces/b2c-fee-config.repository.interface';

// Stripe Provider (reused from zarp-subscriptions)
import { StripeProvider } from '../zarp-subscriptions/infrastructure/providers/stripe.provider';
import { STRIPE_PROVIDER } from '../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

// B2B tokens (needed for unified checkout)
import { B2B_PRODUCT_REPOSITORY } from '../zarp-b2b-payments/domain/interfaces/b2b-product.repository.interface';
import { B2B_PURCHASE_REPOSITORY } from '../zarp-b2b-payments/domain/interfaces/b2b-purchase.repository.interface';
import { B2B_FEE_CONFIG_REPOSITORY } from '../zarp-b2b-payments/domain/interfaces/b2b-fee-config.repository.interface';
import { PrismaB2BProductRepository } from '../zarp-b2b-payments/infrastructure/repositories/prisma-b2b-product.repository';
import { PrismaB2BPurchaseRepository } from '../zarp-b2b-payments/infrastructure/repositories/prisma-b2b-purchase.repository';
import { PrismaB2BFeeConfigRepository } from '../zarp-b2b-payments/infrastructure/repositories/prisma-b2b-fee-config.repository';
import { TENANT_BILLING_CONFIG_REPOSITORY } from '../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';
import { PrismaTenantBillingConfigRepository } from '../zarp-subscriptions/infrastructure/repositories/prisma-tenant-billing-config.repository';
import { OptionalUserGuard } from '../zarp-b2b-payments/infrastructure/guards/optional-user.guard';

@Module({
  imports: [
    DatabaseModule,
    ZarpAuthModule,
    ZarpSubscriptionsModule,
    forwardRef(() =>
      import('../zarp-b2c-subscriptions/zarp-b2c-subscriptions.module').then(
        (m) => m.ZarpB2cSubscriptionsModule,
      ),
    ),
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminFeeConfigController,
    PublicB2CProductsController,
    PublicUnifiedCheckoutController,
  ],
  providers: [
    // Use Cases
    ListProductsUseCase,
    GetProductUseCase,
    AdminListProductsUseCase,
    CreateB2CProductUseCase,
    CalculateOrderCostUseCase,
    ResolveProductFeesUseCase,
    ManageFeeConfigUseCase,
    UnifiedCalculateCostUseCase,
    UnifiedCheckoutUseCase,

    // B2C Repositories
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PRODUCT_PRICE_REPOSITORY, useClass: PrismaProductPriceRepository },
    { provide: PRODUCT_CATEGORY_REPOSITORY, useClass: PrismaProductCategoryRepository },
    { provide: B2C_FEE_CONFIG_REPOSITORY, useClass: PrismaB2CFeeConfigRepository },

    // B2B Repositories (for unified checkout)
    { provide: B2B_PRODUCT_REPOSITORY, useClass: PrismaB2BProductRepository },
    { provide: B2B_PURCHASE_REPOSITORY, useClass: PrismaB2BPurchaseRepository },
    { provide: B2B_FEE_CONFIG_REPOSITORY, useClass: PrismaB2BFeeConfigRepository },
    { provide: TENANT_BILLING_CONFIG_REPOSITORY, useClass: PrismaTenantBillingConfigRepository },

    // External
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
    OptionalUserGuard,
  ],
  exports: [
    PRODUCT_PRICE_REPOSITORY,
    PRODUCT_CATEGORY_REPOSITORY,
    B2C_FEE_CONFIG_REPOSITORY,
    GetProductUseCase,
    ResolveProductFeesUseCase,
  ],
})
export class ZarpB2cProductsModule {}
