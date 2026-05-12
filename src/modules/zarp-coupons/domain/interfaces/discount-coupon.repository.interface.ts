import { DiscountCouponEntity } from '../entities/discount-coupon.entity';
import { ProductOverride } from '../entities/discount-coupon.entity';

export const DISCOUNT_COUPON_REPOSITORY = Symbol('DISCOUNT_COUPON_REPOSITORY');

export interface CreateCouponData {
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  productIds?: string[];
  categoryIds?: string[];
  appliesTo: string;
  cumulative?: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  productOverrides?: ProductOverride[];
}

export interface UpdateCouponData {
  name?: string;
  description?: string | null;
  discountValue?: number;
  productIds?: string[];
  categoryIds?: string[];
  appliesTo?: string;
  cumulative?: boolean;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  active?: boolean;
  productOverrides?: ProductOverride[] | null;
}

export interface CouponListResult {
  data: DiscountCouponEntity[];
  total: number;
}

export interface IDiscountCouponRepository {
  create(data: CreateCouponData): Promise<DiscountCouponEntity>;
  findById(id: string, tenantId: string): Promise<DiscountCouponEntity | null>;
  findByCode(tenantId: string, code: string): Promise<DiscountCouponEntity | null>;
  findAllByTenant(tenantId: string, page: number, limit: number): Promise<CouponListResult>;
  update(id: string, tenantId: string, data: UpdateCouponData): Promise<DiscountCouponEntity>;
  deactivate(id: string, tenantId: string): Promise<void>;
  incrementRedeemedCount(tenantId: string, code: string, maxRedemptions: number | null): Promise<boolean>;
  decrementRedeemedCount(tenantId: string, code: string): Promise<void>;
}
