export interface IAssignAdminTenant {
  admin_id: number;
  tenant_id: number;
}

export interface IAdminTenantRepository {
  assign(data: IAssignAdminTenant): Promise<any>;
  unassign(adminId: number, tenantId: number): Promise<void>;
  findTenantsByAdminId(adminId: number): Promise<any[]>;
  findAdminsByTenantId(tenantId: number): Promise<any[]>;
  isAdminInTenant(adminId: number, tenantId: number): Promise<boolean>;
}

export const ADMIN_TENANT_REPOSITORY = Symbol('ADMIN_TENANT_REPOSITORY');
