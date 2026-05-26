import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IProductCategoryRepository,
  CreateProductCategoryData,
  UpdateProductCategoryData,
} from '../../domain/interfaces/product-category.repository.interface';
import { ProductCategoryEntity } from '../../domain/entities/product-category.entity';

@Injectable()
export class PrismaProductCategoryRepository implements IProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductCategoryData): Promise<ProductCategoryEntity> {
    try {
      const record = await this.prisma.productCategory.create({
        data: {
          tenant_id: data.tenantId,
          name: data.name,
          slug: data.slug,
          chip_cost_percent: data.chipCostPercent ?? null,
          shipping_fee: data.shippingFee ?? null,
          active: true,
        },
      });
      return this.toDomain(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(`Categoria com slug "${data.slug}" já existe`);
      }
      throw error;
    }
  }

  async findAll(tenantId: string): Promise<ProductCategoryEntity[]> {
    const records = await this.prisma.productCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findActive(tenantId: string): Promise<ProductCategoryEntity[]> {
    const records = await this.prisma.productCategory.findMany({
      where: { tenant_id: tenantId, active: true },
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findById(id: string, tenantId: string): Promise<ProductCategoryEntity | null> {
    const record = await this.prisma.productCategory.findFirst({
      where: { id, tenant_id: tenantId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<ProductCategoryEntity | null> {
    const record = await this.prisma.productCategory.findUnique({
      where: { tenant_id_slug: { tenant_id: tenantId, slug } },
    });
    return record ? this.toDomain(record) : null;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateProductCategoryData,
  ): Promise<ProductCategoryEntity> {
    const record = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.chipCostPercent !== undefined && { chip_cost_percent: data.chipCostPercent }),
        ...(data.shippingFee !== undefined && { shipping_fee: data.shippingFee }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return this.toDomain(record);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.productCategory.delete({ where: { id } });
  }

  private toDomain(record: any): ProductCategoryEntity {
    return new ProductCategoryEntity({
      id: record.id,
      tenantId: record.tenant_id,
      name: record.name,
      slug: record.slug,
      chipCostPercent: record.chip_cost_percent,
      shippingFee: record.shipping_fee,
      active: record.active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
