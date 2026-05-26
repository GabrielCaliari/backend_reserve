import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2CFeeConfigRepository,
  UpsertB2CFeeConfigData,
} from '../../domain/interfaces/b2c-fee-config.repository.interface';
import { B2CFeeConfigEntity } from '../../domain/entities/b2c-fee-config.entity';

@Injectable()
export class PrismaB2CFeeConfigRepository implements IB2CFeeConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<B2CFeeConfigEntity | null> {
    const record = await this.prisma.b2CFeeConfig.findUnique({
      where: { tenant_id: tenantId },
    });
    return record ? this.toDomain(record) : null;
  }

  async upsert(tenantId: string, data: UpsertB2CFeeConfigData): Promise<B2CFeeConfigEntity> {
    const record = await this.prisma.b2CFeeConfig.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        chip_cost_percent: data.chipCostPercent,
        shipping_fee: data.shippingFee,
      },
      update: {
        chip_cost_percent: data.chipCostPercent,
        shipping_fee: data.shippingFee,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: any): B2CFeeConfigEntity {
    return new B2CFeeConfigEntity({
      id: record.id,
      tenantId: record.tenant_id,
      chipCostPercent: record.chip_cost_percent,
      shippingFee: record.shipping_fee,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
