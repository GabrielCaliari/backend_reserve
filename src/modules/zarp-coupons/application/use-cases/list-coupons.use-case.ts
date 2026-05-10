import { Injectable, Inject } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
  CouponListResult,
} from '../../domain/interfaces/discount-coupon.repository.interface';

@Injectable()
export class ListCouponsUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(tenantId: string, page = 1, limit = 20): Promise<CouponListResult> {
    return this.couponRepo.findAllByTenant(tenantId, page, limit);
  }
}
