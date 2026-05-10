import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { UpdateCouponDTO } from '../dtos/update-coupon.dto';

@Injectable()
export class UpdateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(id: string, tenantId: string, dto: UpdateCouponDTO): Promise<DiscountCouponEntity> {
    const existing = await this.couponRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Cupom não encontrado');

    return this.couponRepo.update(id, tenantId, {
      name: dto.name,
      description: dto.description,
      discountValue: dto.discountValue,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      appliesTo: dto.appliesTo,
      cumulative: dto.cumulative,
      minOrderAmount: dto.minOrderAmount,
      maxDiscountAmount: dto.maxDiscountAmount,
      maxRedemptions: dto.maxRedemptions,
      expiresAt:
        dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined,
      active: dto.active,
    });
  }
}
