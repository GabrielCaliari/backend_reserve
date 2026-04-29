import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IProductRepository } from '../../domain/interfaces/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductPriceEntity } from '../../domain/entities/product-price.entity';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(tenantId: string): Promise<ProductEntity[]> {
    const records = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, active: true },
      include: { ProductPrice: { where: { active: true } } },
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findBySlug(tenantId: string, slug: string): Promise<ProductEntity | null> {
    const record = await this.prisma.product.findUnique({
      where: {
        tenant_id_slug: {
          tenant_id: tenantId,
          slug: slug,
        },
      },
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
      active: record.active,
      prices: (record.ProductPrice ?? []).map(
        (p: any) =>
          new ProductPriceEntity({
            id: p.id,
            stripePriceId: p.stripe_price_id,
            productId: p.product_id,
            interval: p.interval as 'month' | 'year' | 'week',
            intervalCount: p.interval_count,
            unitAmount: p.unit_amount,
            currency: p.currency,
            active: p.active,
          }),
      ),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
