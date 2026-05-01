import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2BProductRepository,
  CreateB2BProductData,
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
        categories: data.categories ?? [],
        price: data.price,
        currency: data.currency,
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
    );
  }
}
