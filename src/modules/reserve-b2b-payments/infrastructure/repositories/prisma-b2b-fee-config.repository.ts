import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2BFeeConfigRepository,
  UpsertB2BFeeConfigData,
} from '../../domain/interfaces/b2b-fee-config.repository.interface';
import { B2BFeeConfigEntity } from '../../domain/entities/b2b-fee-config.entity';

@Injectable()
export class PrismaB2BFeeConfigRepository implements IB2BFeeConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<B2BFeeConfigEntity | null> {
    const record = await this.prisma.b2BFeeConfig.findUnique({
      where: { tenant_id: tenantId },
    });
    return record ? this.toDomain(record) : null;
  }

  async upsert(tenantId: string, data: UpsertB2BFeeConfigData): Promise<B2BFeeConfigEntity> {
    const record = await this.prisma.b2BFeeConfig.upsert({
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

  private toDomain(record: any): B2BFeeConfigEntity {
    return new B2BFeeConfigEntity({
      id: record.id,
      tenantId: record.tenant_id,
      chipCostPercent: record.chip_cost_percent,
      shippingFee: record.shipping_fee,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
