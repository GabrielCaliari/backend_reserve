import { EDiscountType } from '../enums/discount-type.enum';
import { ECouponScope } from '../enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../enums/coupon-applies-to.enum';

export class DiscountCouponEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly discountType: EDiscountType,
    public readonly discountValue: number,
    public readonly scope: ECouponScope,
    public readonly productIds: string[],
    public readonly categoryIds: string[],
    public readonly appliesTo: ECouponAppliesTo,
    public readonly cumulative: boolean,
    public readonly minOrderAmount: number | null,
    public readonly maxDiscountAmount: number | null,
    public readonly maxRedemptions: number | null,
    public readonly redeemedCount: number,
    public readonly expiresAt: Date | null,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isValid(): boolean {
    if (!this.active) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    if (this.maxRedemptions !== null && this.redeemedCount >= this.maxRedemptions) return false;
    return true;
  }

  appliesToContext(context: 'b2b' | 'b2c'): boolean {
    return this.appliesTo === ECouponAppliesTo.BOTH || this.appliesTo === context;
  }
}
