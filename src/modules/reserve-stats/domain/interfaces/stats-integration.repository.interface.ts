export const STATS_INTEGRATION_REPOSITORY = 'STATS_INTEGRATION_REPOSITORY';

export interface IStatsIntegration {
  id: string;
  tenant_id: string;
  key: string;
  label: string;
  config: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IStatsIntegrationRepository {
  findByTenant(tenantId: string): Promise<IStatsIntegration[]>;
  findByTenantAndKey(
    tenantId: string,
    key: string,
  ): Promise<IStatsIntegration | null>;
  findById(id: string): Promise<IStatsIntegration | null>;
  create(
    data: Omit<IStatsIntegration, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IStatsIntegration>;
  update(
    id: string,
    data: Partial<
      Omit<IStatsIntegration, 'id' | 'tenant_id' | 'key' | 'created_at' | 'updated_at'>
    >,
  ): Promise<IStatsIntegration>;
  delete(id: string): Promise<void>;
}
