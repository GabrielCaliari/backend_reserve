import { Injectable, Inject, UnprocessableEntityException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export interface CartItemForValidation {
  productId: string;
  categoryId?: string | null;
  basePrice: number;
  quantity: number;
  isRecurring?: boolean;
  /**
   * Type of product in the cart. Used to restrict coupon eligibility:
   * - A coupon with applies_to='b2b'      only discounts items where itemType='b2b'.
   * - A coupon with applies_to='b2c*'     only discounts items where itemType='b2c'.
   * - A coupon with applies_to='both'     discounts all items regardless of itemType.
   * Items WITHOUT itemType are EXCLUDED from type-restricted coupons (strict/safe default).
   * Always set this field explicitly in checkout and validate calls.
   */
  itemType?: 'b2b' | 'b2c';
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
  /**
   * Which item types this coupon applies to.
   * - 'b2b'  — only B2B products (books, tabs, etc.)
   * - 'b2c'  — only B2C products (courses, subscriptions)
   * - 'all'  — all item types
   */
  applicableItemType: 'b2b' | 'b2c' | 'all';
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
    /**
     * 'b2b'     — pure B2B cart (only B2B items)
     * 'b2c'     — pure B2C cart (only B2C items)
     * 'unified' — mixed cart; eligibility is determined solely by itemType on each item
     */
    context: 'b2b' | 'b2c' | 'unified',
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

      // In 'unified' context, skip the context gate — per-item itemType filtering handles eligibility.
      if (context !== 'unified' && !coupon.appliesToContext(context)) {
        throw new UnprocessableEntityException(`Cupom inválido: ${code}`);
      }

      // For recurring/one-time checks, only look at the items that would actually be eligible
      const typeEligible = this.filterByItemType(coupon, cartItems);
      if (coupon.requiresRecurring() && !typeEligible.some((i) => i.isRecurring)) {
        throw new UnprocessableEntityException(
          `Cupom ${code} é válido apenas para produtos com assinatura recorrente`,
        );
      }

      if (coupon.requiresOneTime() && !typeEligible.some((i) => !i.isRecurring)) {
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
      const rawDiscount =
        coupon.scope === ECouponScope.PRODUCT && coupon.productOverrides.length > 0
          ? this.computeRawDiscountWithOverrides(coupon, cartItems)
          : this.computeRawDiscount(coupon, eligible);
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
        applicableItemType: this.resolveApplicableItemType(coupon.appliesTo),
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

  /**
   * Step 1 — filter items by the coupon's appliesTo.
   * Items that don't have itemType set are EXCLUDED from type-restricted coupons
   * (safe / strict default — the caller must explicitly tag each item).
   */
  private filterByItemType(
    coupon: DiscountCouponEntity,
    cartItems: CartItemForValidation[],
  ): CartItemForValidation[] {
    if (coupon.appliesTo === ECouponAppliesTo.B2B) {
      return cartItems.filter((i) => i.itemType === 'b2b');
    }
    if (
      coupon.appliesTo === ECouponAppliesTo.B2C ||
      coupon.appliesTo === ECouponAppliesTo.B2C_RECURRING ||
      coupon.appliesTo === ECouponAppliesTo.B2C_ONE_TIME
    ) {
      return cartItems.filter((i) => i.itemType === 'b2c');
    }
    // ECouponAppliesTo.BOTH — all items eligible regardless of itemType
    return cartItems;
  }

  private computeEligibleAmount(
    coupon: DiscountCouponEntity,
    cartItems: CartItemForValidation[],
  ): number {
    // When productOverrides exist, discount is computed per-item in computeRawDiscountWithOverrides.
    // Return 0 here so the generic computeRawDiscount path is bypassed.
    if (coupon.scope === ECouponScope.PRODUCT && coupon.productOverrides.length > 0) {
      return 0;
    }

    // Step 1: filter by item type (strict — no fallback when itemType is absent)
    let items = this.filterByItemType(coupon, cartItems);

    // Step 2: filter by recurring/one-time requirement
    if (coupon.requiresRecurring()) {
      items = items.filter((i) => i.isRecurring);
    } else if (coupon.requiresOneTime()) {
      items = items.filter((i) => !i.isRecurring);
    }

    // Step 3: filter by scope
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

  /**
   * Computes the total discount when productOverrides are present.
   * Each eligible product uses its override's discountType/discountValue if one exists,
   * falling back to the coupon's global discountType/discountValue otherwise.
   */
  private computeRawDiscountWithOverrides(
    coupon: DiscountCouponEntity,
    cartItems: CartItemForValidation[],
  ): number {
    let items = this.filterByItemType(coupon, cartItems);

    if (coupon.requiresRecurring()) {
      items = items.filter((i) => i.isRecurring);
    } else if (coupon.requiresOneTime()) {
      items = items.filter((i) => !i.isRecurring);
    }

    // Only items whose productId is in the coupon's productIds list are eligible
    const eligible = items.filter((i) => coupon.productIds.includes(i.productId));

    return eligible.reduce((total, item) => {
      const override = coupon.getProductOverride(item.productId);
      const type = override ? override.discountType : coupon.discountType;
      const value = override ? override.discountValue : coupon.discountValue;
      const itemTotal = item.basePrice * item.quantity;

      const itemDiscount =
        type === EDiscountType.PERCENTAGE
          ? Math.round(itemTotal * (value / 100))
          : Math.min(value * item.quantity, itemTotal);

      return total + itemDiscount;
    }, 0);
  }

  private resolveApplicableItemType(appliesTo: ECouponAppliesTo): 'b2b' | 'b2c' | 'all' {
    if (appliesTo === ECouponAppliesTo.B2B) return 'b2b';
    if (
      appliesTo === ECouponAppliesTo.B2C ||
      appliesTo === ECouponAppliesTo.B2C_RECURRING ||
      appliesTo === ECouponAppliesTo.B2C_ONE_TIME
    ) {
      return 'b2c';
    }
    return 'all'; // ECouponAppliesTo.BOTH
  }

  private buildDescription(coupon: DiscountCouponEntity): string {
    if (coupon.discountType === EDiscountType.PERCENTAGE) {
      return `${coupon.name} (${coupon.discountValue}%)`;
    }
    const reais = (coupon.discountValue / 100).toFixed(2).replace('.', ',');
    return `${coupon.name} (R$ ${reais})`;
  }
}
