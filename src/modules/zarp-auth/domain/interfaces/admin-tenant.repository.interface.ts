import { EAdminRole } from '../enums/admin-role.enum';

export interface IAssignAdminTenant {
  admin_id: string;
  tenant_id: number;
  role?: EAdminRole;
}

export interface IAdminTenantRepository {
  assign(data: IAssignAdminTenant): Promise<any>;
  unassign(adminId: string, tenantId: number): Promise<void>;
  updateRole(adminId: string, tenantId: number, role: EAdminRole): Promise<any>;
  findTenantsByAdminId(adminId: string): Promise<any[]>;
  findAdminsByTenantId(tenantId: number): Promise<any[]>;
  isAdminInTenant(adminId: string, tenantId: number): Promise<boolean>;
  findRoleInTenant(adminId: string, tenantId: number): Promise<EAdminRole | null>;
}

export const ADMIN_TENANT_REPOSITORY = Symbol('ADMIN_TENANT_REPOSITORY');
