export const STATS_INTEGRATION_REPOSITORY = 'STATS_INTEGRATION_REPOSITORY';

export interface IStatsIntegration {
  id: number;
  tenant_id: number;
  key: string;
  label: string;
  config: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IStatsIntegrationRepository {
  findByTenant(tenantId: number): Promise<IStatsIntegration[]>;
  findByTenantAndKey(
    tenantId: number,
    key: string,
  ): Promise<IStatsIntegration | null>;
  findById(id: number): Promise<IStatsIntegration | null>;
  create(
    data: Omit<IStatsIntegration, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IStatsIntegration>;
  update(
    id: number,
    data: Partial<
      Omit<IStatsIntegration, 'id' | 'tenant_id' | 'key' | 'created_at' | 'updated_at'>
    >,
  ): Promise<IStatsIntegration>;
  delete(id: number): Promise<void>;
}
