import { Injectable, Inject, ConflictException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { CreateCouponDTO } from '../dtos/create-coupon.dto';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(tenantId: string, dto: CreateCouponDTO): Promise<DiscountCouponEntity> {
    const existing = await this.couponRepo.findByCode(tenantId, dto.code);
    if (existing) throw new ConflictException(`Cupom com código '${dto.code}' já existe`);

    return this.couponRepo.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      scope: dto.scope,
      productIds: dto.productIds ?? [],
      categoryIds: dto.categoryIds ?? [],
      appliesTo: dto.appliesTo,
      cumulative: dto.cumulative ?? false,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      maxRedemptions: dto.maxRedemptions ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      productOverrides: dto.productOverrides ?? [],
    });
  }
}
