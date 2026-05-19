export const TENANT_SETTING_REPOSITORY = Symbol('TENANT_SETTING_REPOSITORY');

export interface ITenantSettingRow {
  key: string;
  value: unknown;
}

export interface ITenantSettingRepository {
  findByTenantAndModule(tenantId: string, module: string): Promise<ITenantSettingRow[]>;
  findOne(tenantId: string, module: string, key: string): Promise<{ value: unknown } | null>;
  upsert(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void>;
}
