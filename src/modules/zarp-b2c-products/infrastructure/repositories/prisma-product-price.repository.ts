import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IProductPriceRepository,
  CreateProductPriceData,
} from '../../domain/interfaces/product-price.repository.interface';
import { ProductPriceEntity } from '../../domain/entities/product-price.entity';

@Injectable()
export class PrismaProductPriceRepository implements IProductPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductPriceData): Promise<ProductPriceEntity> {
    const record = await this.prisma.productPrice.create({
      data: {
        tenant_id: data.tenantId,
        product_id: data.productId,
        stripe_price_id: data.stripePriceId,
        name: 'Default',
        billing_mode: 'unlimited',
        interval: data.interval,
        interval_count: data.intervalCount,
        unit_amount: data.unitAmount,
        currency: data.currency,
        active: true,
      },
    });
    return this.toDomain(record);
  }

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
      name: record.name,
      billingMode: record.billing_mode as 'unlimited' | 'limited' | 'one_time' | 'one_time_exp',
      interval: record.interval as 'month' | 'year' | 'week' | null,
      intervalCount: record.interval_count,
      unitAmount: record.unit_amount,
      currency: record.currency,
      maxBillingCycles: record.max_billing_cycles,
      accessDurationDays: record.access_duration_days,
      active: record.active,
    });
  }
}
