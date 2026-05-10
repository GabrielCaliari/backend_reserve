import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IDiscountCouponRepository,
  CreateCouponData,
  UpdateCouponData,
  CouponListResult,
} from '../../domain/interfaces/discount-coupon.repository.interface';
import { DiscountCouponEntity } from '../../domain/entities/discount-coupon.entity';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

@Injectable()
export class PrismaDiscountCouponRepository implements IDiscountCouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCouponData): Promise<DiscountCouponEntity> {
    const record = await this.prisma.discountCoupon.create({
      data: {
        tenant_id: data.tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        scope: data.scope,
        product_ids: data.productIds ?? [],
        category_ids: data.categoryIds ?? [],
        applies_to: data.appliesTo,
        cumulative: data.cumulative ?? false,
        min_order_amount: data.minOrderAmount ?? null,
        max_discount_amount: data.maxDiscountAmount ?? null,
        max_redemptions: data.maxRedemptions ?? null,
        expires_at: data.expiresAt ?? null,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string, tenantId: string): Promise<DiscountCouponEntity | null> {
    const record = await this.prisma.discountCoupon.findFirst({
      where: { id, tenant_id: tenantId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<DiscountCouponEntity | null> {
    const record = await this.prisma.discountCoupon.findUnique({
      where: { tenant_id_code: { tenant_id: tenantId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByTenant(tenantId: string, page: number, limit: number): Promise<CouponListResult> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.discountCoupon.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.discountCoupon.count({ where: { tenant_id: tenantId } }),
    ]);
    return { data: data.map((r) => this.toDomain(r)), total };
  }

  async update(id: string, tenantId: string, data: UpdateCouponData): Promise<DiscountCouponEntity> {
    const record = await this.prisma.discountCoupon.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountValue !== undefined && { discount_value: data.discountValue }),
        ...(data.productIds !== undefined && { product_ids: data.productIds }),
        ...(data.categoryIds !== undefined && { category_ids: data.categoryIds }),
        ...(data.appliesTo !== undefined && { applies_to: data.appliesTo }),
        ...(data.cumulative !== undefined && { cumulative: data.cumulative }),
        ...(data.minOrderAmount !== undefined && { min_order_amount: data.minOrderAmount }),
        ...(data.maxDiscountAmount !== undefined && { max_discount_amount: data.maxDiscountAmount }),
        ...(data.maxRedemptions !== undefined && { max_redemptions: data.maxRedemptions }),
        ...(data.expiresAt !== undefined && { expires_at: data.expiresAt }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return this.toDomain(record);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    await this.prisma.discountCoupon.updateMany({
      where: { id, tenant_id: tenantId },
      data: { active: false },
    });
  }

  async incrementRedeemedCount(
    tenantId: string,
    code: string,
    maxRedemptions: number | null,
  ): Promise<boolean> {
    if (maxRedemptions === null) {
      await this.prisma.discountCoupon.updateMany({
        where: { tenant_id: tenantId, code },
        data: { redeemed_count: { increment: 1 } },
      });
      return true;
    }

    const result = await this.prisma.discountCoupon.updateMany({
      where: {
        tenant_id: tenantId,
        code,
        redeemed_count: { lt: maxRedemptions },
      },
      data: { redeemed_count: { increment: 1 } },
    });

    return result.count > 0;
  }

  async decrementRedeemedCount(tenantId: string, code: string): Promise<void> {
    await this.prisma.discountCoupon.updateMany({
      where: { tenant_id: tenantId, code, redeemed_count: { gt: 0 } },
      data: { redeemed_count: { decrement: 1 } },
    });
  }

  private toDomain(record: any): DiscountCouponEntity {
    return new DiscountCouponEntity(
      record.id,
      record.tenant_id,
      record.code,
      record.name,
      record.description ?? null,
      record.discount_type as EDiscountType,
      record.discount_value,
      record.scope as ECouponScope,
      record.product_ids ?? [],
      record.category_ids ?? [],
      record.applies_to as ECouponAppliesTo,
      record.cumulative,
      record.min_order_amount ?? null,
      record.max_discount_amount ?? null,
      record.max_redemptions ?? null,
      record.redeemed_count,
      record.expires_at ?? null,
      record.active,
      record.created_at,
      record.updated_at,
    );
  }
}
