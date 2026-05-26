import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';

@Injectable()
export class DeleteCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const existing = await this.couponRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Cupom não encontrado');
    await this.couponRepo.deactivate(id, tenantId);
  }
}
