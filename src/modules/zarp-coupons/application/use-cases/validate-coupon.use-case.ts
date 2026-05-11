import { Injectable, Inject, UnprocessableEntityException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';

export interface CartItemForValidation {
  productId: string;
  categoryId?: string | null;
  basePrice: number;
  quantity: number;
  isRecurring?: boolean;
}

export interface CouponLineResult {
  code: string;
  discountAmount: number;
  description: string;
  /** Scope that determined discount: 'order' | 'product' | 'category' */
  scope: string;
  /** Product IDs this coupon specifically targets (empty if scope is 'order') */
  affectedProductIds: string[];
  /** Category IDs this coupon specifically targets (empty if scope is 'order' or 'product') */
  affectedCategoryIds: string[];
}

export interface CouponValidationResult {
  valid: boolean;
  coupons: CouponLineResult[];
  totalDiscount: number;
  orderTotal: number;
  finalTotal: number;
}

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(
    tenantId: string,
    codes: string[],
    cartItems: CartItemForValidation[],
    context: 'b2b' | 'b2c',
  ): Promise<CouponValidationResult> {
    const cartTotal = cartItems.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
    const results: CouponLineResult[] = [];
    let hasNonCumulative = false;

    for (const rawCode of codes) {
      const code = rawCode.toUpperCase().trim();
      const coupon = await this.couponRepo.findByCode(tenantId, code);

      if (!coupon || !coupon.isValid()) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      if (!coupon.appliesToContext(context)) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      if (coupon.requiresRecurring() && !cartItems.some((i) => i.isRecurring)) {
        throw new UnprocessableEntityException(
          `Cupom ${code} é válido apenas para produtos com assinatura recorrente`,
        );
      }

      if (coupon.requiresOneTime() && !cartItems.some((i) => !i.isRecurring)) {
        throw new UnprocessableEntityException(
          `Cupom ${code} é válido apenas para produtos de compra única`,
        );
      }

      if (results.length > 0 && (!coupon.cumulative || hasNonCumulative)) {
        throw new UnprocessableEntityException(
          `O cupom ${code} não pode ser combinado com outros cupons`,
        );
      }

      if (coupon.minOrderAmount !== null && cartTotal < coupon.minOrderAmount) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      const eligible = this.computeEligibleAmount(coupon, cartItems);
      const rawDiscount = this.computeRawDiscount(coupon, eligible);
      const discount =
        coupon.maxDiscountAmount !== null
          ? Math.min(rawDiscount, coupon.maxDiscountAmount)
          : rawDiscount;

      if (!coupon.cumulative) hasNonCumulative = true;

      results.push({
        code,
        discountAmount: discount,
        description: this.buildDescription(coupon),
        scope: coupon.scope,
        affectedProductIds: coupon.scope === ECouponScope.PRODUCT ? coupon.productIds : [],
        affectedCategoryIds: coupon.scope === ECouponScope.CATEGORY ? coupon.categoryIds : [],
      });
    }

    let totalDiscount = results.reduce((s, r) => s + r.discountAmount, 0);
    totalDiscount = Math.min(totalDiscount, cartTotal);

    return {
      valid: true,
      coupons: results,
      totalDiscount,
      orderTotal: cartTotal,
      finalTotal: cartTotal - totalDiscount,
    };
  }

  private computeEligibleAmount(
    coupon: DiscountCouponEntity,
    cartItems: CartItemForValidation[],
  ): number {
    const items = coupon.requiresRecurring()
      ? cartItems.filter((i) => i.isRecurring)
      : coupon.requiresOneTime()
        ? cartItems.filter((i) => !i.isRecurring)
        : cartItems;

    if (coupon.scope === ECouponScope.ORDER) {
      return items.reduce((s, i) => s + i.basePrice * i.quantity, 0);
    }
    if (coupon.scope === ECouponScope.PRODUCT) {
      return items
        .filter((i) => coupon.productIds.includes(i.productId))
        .reduce((s, i) => s + i.basePrice * i.quantity, 0);
    }
    return items
      .filter((i) => i.categoryId != null && coupon.categoryIds.includes(i.categoryId))
      .reduce((s, i) => s + i.basePrice * i.quantity, 0);
  }

  private computeRawDiscount(coupon: DiscountCouponEntity, eligibleAmount: number): number {
    if (coupon.discountType === EDiscountType.PERCENTAGE) {
      return Math.round(eligibleAmount * (coupon.discountValue / 100));
    }
    return Math.min(coupon.discountValue, eligibleAmount);
  }

  private buildDescription(coupon: DiscountCouponEntity): string {
    if (coupon.discountType === EDiscountType.PERCENTAGE) {
      return `${coupon.name} (${coupon.discountValue}%)`;
    }
    const reais = (coupon.discountValue / 100).toFixed(2).replace('.', ',');
    return `${coupon.name} (R$ ${reais})`;
  }
}
