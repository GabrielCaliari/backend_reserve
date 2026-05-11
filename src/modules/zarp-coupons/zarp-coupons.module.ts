import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../../shared/database/database.module';

import { PublicCouponsController } from './infrastructure/controllers/public-coupons.controller';

import { CreateCouponUseCase } from './application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from './application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './application/use-cases/delete-coupon.use-case';
import { ListCouponsUseCase } from './application/use-cases/list-coupons.use-case';
import { GetCouponUseCase } from './application/use-cases/get-coupon.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';

import { PrismaDiscountCouponRepository } from './infrastructure/repositories/prisma-discount-coupon.repository';
import { DISCOUNT_COUPON_REPOSITORY } from './domain/interfaces/discount-coupon.repository.interface';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
  ],
  controllers: [PublicCouponsController],
  providers: [
    CreateCouponUseCase,
    UpdateCouponUseCase,
    DeleteCouponUseCase,
    ListCouponsUseCase,
    GetCouponUseCase,
    ValidateCouponUseCase,
    { provide: DISCOUNT_COUPON_REPOSITORY, useClass: PrismaDiscountCouponRepository },
  ],
  exports: [
    CreateCouponUseCase,
    UpdateCouponUseCase,
    DeleteCouponUseCase,
    ListCouponsUseCase,
    GetCouponUseCase,
    ValidateCouponUseCase,
    DISCOUNT_COUPON_REPOSITORY,
  ],
})
export class ZarpCouponsModule {}
