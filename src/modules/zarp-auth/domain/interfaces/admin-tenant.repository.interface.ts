import { EAdminRole } from '../enums/admin-role.enum';

export interface IAssignAdminTenant {
  admin_id: string;
  tenant_id: string;
  role?: EAdminRole;
}

export interface IAdminTenantRepository {
  assign(data: IAssignAdminTenant): Promise<any>;
  unassign(adminId: string, tenantId: string): Promise<void>;
  updateRole(adminId: string, tenantId: string, role: EAdminRole): Promise<any>;
  findTenantsByAdminId(adminId: string): Promise<any[]>;
  findAdminsByTenantId(tenantId: string): Promise<any[]>;
  isAdminInTenant(adminId: string, tenantId: string): Promise<boolean>;
  findRoleInTenant(adminId: string, tenantId: string): Promise<EAdminRole | null>;
}

export const ADMIN_TENANT_REPOSITORY = Symbol('ADMIN_TENANT_REPOSITORY');
