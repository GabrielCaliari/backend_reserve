import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IProductRepository,
  CreateProductData,
} from '../../domain/interfaces/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductPriceEntity } from '../../domain/entities/product-price.entity';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductData): Promise<ProductEntity> {
    const record = await this.prisma.product.create({
      data: {
        tenant_id: data.tenantId,
        stripe_product_id: data.stripeProductId,
        name: data.name,
        description: data.description,
        slug: data.slug,
        categories: data.categories ?? [],
        active: true,
      },
      include: { ProductPrice: true },
    });
    return this.toDomain(record);
  }

  async findAllActive(tenantId: string): Promise<ProductEntity[]> {
    const records = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, active: true },
      include: { ProductPrice: { where: { active: true } } },
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAll(tenantId: string): Promise<ProductEntity[]> {
    const records = await this.prisma.product.findMany({
      where: { tenant_id: tenantId },
      include: { ProductPrice: true },
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findBySlug(tenantId: string, slug: string): Promise<ProductEntity | null> {
    const record = await this.prisma.product.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug } },
      include: { ProductPrice: { where: { active: true } } },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findById(id: string, tenantId: string): Promise<ProductEntity | null> {
    const record = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
      include: { ProductPrice: { where: { active: true } } },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  private toDomain(record: any): ProductEntity {
    return new ProductEntity({
      id: record.id,
      stripeProductId: record.stripe_product_id,
      name: record.name,
      description: record.description ?? undefined,
      slug: record.slug,
      categories: record.categories ?? [],
      active: record.active,
      prices: (record.ProductPrice ?? []).map(
        (p: any) =>
          new ProductPriceEntity({
            id: p.id,
            stripePriceId: p.stripe_price_id,
            productId: p.product_id,
            name: p.name,
            billingMode: p.billing_mode as 'unlimited' | 'limited' | 'one_time' | 'one_time_exp',
            interval: p.interval as 'month' | 'year' | 'week' | null,
            intervalCount: p.interval_count,
            unitAmount: p.unit_amount,
            currency: p.currency,
            maxBillingCycles: p.max_billing_cycles,
            accessDurationDays: p.access_duration_days,
            active: p.active,
          }),
      ),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
