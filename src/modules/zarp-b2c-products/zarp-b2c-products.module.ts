import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';
import { ZarpSubscriptionsModule } from '../zarp-subscriptions/zarp-subscriptions.module';

// Controllers
import { ProductsController } from './infrastructure/controllers/products.controller';
import { AdminProductsController } from './infrastructure/controllers/admin-products.controller';

// Use Cases
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { AdminListProductsUseCase } from './application/use-cases/admin-list-products.use-case';
import { CreateB2CProductUseCase } from './application/use-cases/create-b2c-product.use-case';

// Repositories
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { PrismaProductPriceRepository } from './infrastructure/repositories/prisma-product-price.repository';
import { PRODUCT_REPOSITORY } from './domain/interfaces/product.repository.interface';
import { PRODUCT_PRICE_REPOSITORY } from './domain/interfaces/product-price.repository.interface';

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
  controllers: [ProductsController, AdminProductsController],
  providers: [
    ListProductsUseCase,
    GetProductUseCase,
    AdminListProductsUseCase,
    CreateB2CProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PRODUCT_PRICE_REPOSITORY, useClass: PrismaProductPriceRepository },
    { provide: STRIPE_PROVIDER, useClass: StripeProvider },
  ],
  exports: [PRODUCT_PRICE_REPOSITORY, GetProductUseCase],
})
export class ZarpB2cProductsModule {}
