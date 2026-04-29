import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IProductPriceRepository } from '../../domain/interfaces/product-price.repository.interface';
import { ProductPriceEntity } from '../../domain/entities/product-price.entity';

@Injectable()
export class PrismaProductPriceRepository implements IProductPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByProductId(productId: string): Promise<ProductPriceEntity[]> {
    const records = await this.prisma.productPrice.findMany({
      where: { product_id: productId, active: true },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByStripePriceId(
    tenantId: string,
    stripePriceId: string,
  ): Promise<ProductPriceEntity | null> {
    const record = await this.prisma.productPrice.findUnique({
      where: {
        tenant_id_stripe_price_id: {
          tenant_id: tenantId,
          stripe_price_id: stripePriceId,
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  private toDomain(record: any): ProductPriceEntity {
    return new ProductPriceEntity({
      id: record.id,
      stripePriceId: record.stripe_price_id,
      productId: record.product_id,
      interval: record.interval as 'month' | 'year' | 'week',
      intervalCount: record.interval_count,
      unitAmount: record.unit_amount,
      currency: record.currency,
      active: record.active,
    });
  }
}
