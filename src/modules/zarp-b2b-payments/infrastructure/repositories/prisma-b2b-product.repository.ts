import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2BProductRepository,
  CreateB2BProductData,
  UpdateB2BProductFeeData,
} from '../../domain/interfaces/b2b-product.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';

@Injectable()
export class PrismaB2BProductRepository implements IB2BProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateB2BProductData): Promise<B2BProductEntity> {
    const record = await this.prisma.b2BProduct.create({
      data: {
        tenant_id: data.tenantId,
        stripe_product_id: data.stripeProductId,
        stripe_price_id: data.stripePriceId,
        name: data.name,
        description: data.description,
        slug: data.slug,
        categories: data.categories ?? [],
        price: data.price,
        currency: data.currency,
        category_id: data.categoryId ?? null,
        requires_shipping: data.requiresShipping ?? false,
        chip_cost_override: data.chipCostOverride ?? null,
        shipping_fee_override: data.shippingFeeOverride ?? null,
      },
    });
    return this.toDomain(record);
  }

  async findAllByTenant(tenantId: string): Promise<B2BProductEntity[]> {
    const records = await this.prisma.b2BProduct.findMany({
      where: { tenant_id: tenantId, active: true },
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findById(id: string, tenantId: string): Promise<B2BProductEntity | null> {
    const record = await this.prisma.b2BProduct.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findBySlug(tenantId: string, slug: string): Promise<B2BProductEntity | null> {
    const record = await this.prisma.b2BProduct.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByStripeProductId(
    tenantId: string,
    stripeProductId: string,
  ): Promise<B2BProductEntity | null> {
    const record = await this.prisma.b2BProduct.findUnique({
      where: {
        tenant_id_stripe_product_id: {
          tenant_id: tenantId,
          stripe_product_id: stripeProductId,
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCategoryId(tenantId: string, categoryId: string): Promise<B2BProductEntity[]> {
    const records = await this.prisma.b2BProduct.findMany({
      where: { tenant_id: tenantId, category_id: categoryId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async updateFees(
    id: string,
    tenantId: string,
    data: UpdateB2BProductFeeData,
  ): Promise<B2BProductEntity> {
    const record = await this.prisma.b2BProduct.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined && { category_id: data.categoryId }),
        ...(data.chipCostOverride !== undefined && { chip_cost_override: data.chipCostOverride }),
        ...(data.shippingFeeOverride !== undefined && { shipping_fee_override: data.shippingFeeOverride }),
        ...(data.requiresShipping !== undefined && { requires_shipping: data.requiresShipping }),
      },
    });
    return this.toDomain(record);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    await this.prisma.b2BProduct.updateMany({
      where: { id, tenant_id: tenantId },
      data: { active: false },
    });
  }

  private toDomain(record: any): B2BProductEntity {
    return new B2BProductEntity(
      record.id,
      record.tenant_id,
      record.stripe_product_id,
      record.stripe_price_id,
      record.name,
      record.description ?? null,
      record.categories ?? [],
      record.price,
      record.currency,
      record.active,
      record.created_at,
      record.updated_at,
      record.category_id ?? null,
      record.chip_cost_override ?? null,
      record.shipping_fee_override ?? null,
      record.requires_shipping ?? false,
      record.slug ?? '',
    );
  }
}
