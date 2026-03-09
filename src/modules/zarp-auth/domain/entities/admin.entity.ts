import { EAdminRole } from '../enums/admin-role.enum';

export interface ICreateAdmin {
  name: string;
  email: string;
  role?: EAdminRole;
}

/**
 * Admin domain entity.
 * Encapsulates business rules around admin identity, roles, and tenant access.
 */
export class Admin {
  public readonly id?: string;
  public name: string;
  public email: string;
  public role: EAdminRole;
  public active: boolean;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  /** Tenant IDs this admin is assigned to (populated from AdminTenant) */
  public tenantIds: string[];

  constructor(data: {
    id?: string;
    name: string;
    email: string;
    role?: EAdminRole;
    active?: boolean;
    tenantIds?: string[];
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.role = data.role ?? EAdminRole.manager;
    this.active = data.active ?? true;
    this.tenantIds = data.tenantIds ?? [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  isSuperAdmin(): boolean {
    return this.role === EAdminRole.super_admin;
  }

  isCompanyAdmin(): boolean {
    return this.role === EAdminRole.company_admin || this.role === EAdminRole.manager;
  }

  belongsToTenant(tenantId: string): boolean {
    if (this.isSuperAdmin()) return true;
    return this.tenantIds.includes(tenantId);
  }

  canManageAdmin(targetAdmin: Admin): boolean {
    if (!this.isSuperAdmin()) return false;
    return true;
  }
}
