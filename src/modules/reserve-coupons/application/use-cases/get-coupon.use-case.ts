import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';

@Injectable()
export class GetCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<DiscountCouponEntity> {
    const coupon = await this.couponRepo.findById(id, tenantId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }
}
