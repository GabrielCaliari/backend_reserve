import { B2BFeeConfigEntity } from '../entities/b2b-fee-config.entity';

export const B2B_FEE_CONFIG_REPOSITORY = Symbol('B2B_FEE_CONFIG_REPOSITORY');

export interface UpsertB2BFeeConfigData {
  chipCostPercent: number;
  shippingFee: number;
}

export interface IB2BFeeConfigRepository {
  findByTenantId(tenantId: string): Promise<B2BFeeConfigEntity | null>;
  upsert(tenantId: string, data: UpsertB2BFeeConfigData): Promise<B2BFeeConfigEntity>;
}
