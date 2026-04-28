import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';

import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';

import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { PrismaProductPriceRepository } from './infrastructure/repositories/prisma-product-price.repository';
import { PRODUCT_REPOSITORY } from './domain/interfaces/product.repository.interface';
import { PRODUCT_PRICE_REPOSITORY } from './domain/interfaces/product-price.repository.interface';

import { ProductsController } from './infrastructure/controllers/products.controller';

@Module({
  imports: [
    DatabaseModule,
    ZarpAuthModule,
    forwardRef(() => import('../zarp-b2c-subscriptions/zarp-b2c-subscriptions.module').then(m => m.ZarpB2cSubscriptionsModule)),
  ],
  controllers: [ProductsController],
  providers: [
    ListProductsUseCase,
    GetProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: PRODUCT_PRICE_REPOSITORY, useClass: PrismaProductPriceRepository },
  ],
  exports: [PRODUCT_PRICE_REPOSITORY, GetProductUseCase],
})
export class ZarpB2cProductsModule {}
