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
  findTenantsByAdminIdPaginated(adminId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  findAdminsByTenantId(tenantId: string): Promise<any[]>;
  findAdminsByTenantIdPaginated(tenantId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  isAdminInTenant(adminId: string, tenantId: string): Promise<boolean>;
  findRoleInTenant(adminId: string, tenantId: string): Promise<EAdminRole | null>;
}

export const ADMIN_TENANT_REPOSITORY = Symbol('ADMIN_TENANT_REPOSITORY');
