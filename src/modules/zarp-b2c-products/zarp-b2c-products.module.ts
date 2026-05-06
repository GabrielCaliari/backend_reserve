import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';

// Controllers
import { ProductsController } from './infrastructure/controllers/products.controller';
import { AdminProductsController } from './infrastructure/controllers/admin-products.controller';
import { AdminFeeConfigController } from './infrastructure/controllers/admin-fee-config.controller';

// Use Cases
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { AdminListProductsUseCase } from './application/use-cases/admin-list-products.use-case';
import { CreateB2CProductUseCase } from './application/use-cases/create-b2c-product.use-case';
import { CalculateOrderCostUseCase } from './application/use-cases/calculate-order-cost.use-case';
import { ResolveProductFeesUseCase } from './application/use-cases/resolve-product-fees.use-case';
import { ManageFeeConfigUseCase } from './application/use-cases/manage-fee-config.use-case';

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
  controllers: [ProductsController, AdminProductsController, AdminFeeConfigController],
  providers: [
    // Use Cases
    ListProductsUseCase,
    GetProductUseCase,
    AdminListProductsUseCase,
    CreateB2CProductUseCase,
    CalculateOrderCostUseCase,
    ResolveProductFeesUseCase,
    ManageFeeConfigUseCase,

    // Repositories
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PRODUCT_PRICE_REPOSITORY, useClass: PrismaProductPriceRepository },
    { provide: PRODUCT_CATEGORY_REPOSITORY, useClass: PrismaProductCategoryRepository },
    { provide: B2C_FEE_CONFIG_REPOSITORY, useClass: PrismaB2CFeeConfigRepository },

    // External
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
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
