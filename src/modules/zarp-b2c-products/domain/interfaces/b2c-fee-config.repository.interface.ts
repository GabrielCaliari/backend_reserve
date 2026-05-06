import { B2CFeeConfigEntity } from '../entities/b2c-fee-config.entity';

export const B2C_FEE_CONFIG_REPOSITORY = Symbol('B2C_FEE_CONFIG_REPOSITORY');

export interface UpsertB2CFeeConfigData {
  chipCostPercent: number;
  shippingFee: number;
}

export interface IB2CFeeConfigRepository {
  findByTenantId(tenantId: string): Promise<B2CFeeConfigEntity | null>;
  upsert(tenantId: string, data: UpsertB2CFeeConfigData): Promise<B2CFeeConfigEntity>;
}
