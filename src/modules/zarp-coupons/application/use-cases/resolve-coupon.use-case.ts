import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export interface PublicCouponData {
  code: string;
  name: string;
  description: string | null;
  discountType: EDiscountType;
  discountValue: number;
  scope: ECouponScope;
  appliesTo: ECouponAppliesTo;
  expiresAt: Date | null;
  /** true se o cupom está ativo e dentro da validade/limite de resgates */
  valid: boolean;
}

/**
 * Resolve um cupom pelo código para exibição pública no site final.
 * Retorna apenas os dados necessários para mostrar o desconto no carrinho.
 * Não expõe dados sensíveis como tenant_id, redeemed_count, max_redemptions, etc.
 */
@Injectable()
export class ResolveCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(tenantId: string, code: string): Promise<PublicCouponData> {
    const normalized = code.toUpperCase().trim();
    const coupon = await this.couponRepo.findByCode(tenantId, normalized);

    if (!coupon || !coupon.active) {
      throw new NotFoundException('Cupom não encontrado');
    }

    return {
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      scope: coupon.scope,
      appliesTo: coupon.appliesTo,
      expiresAt: coupon.expiresAt,
      valid: coupon.isValid(),
    };
  }
}
