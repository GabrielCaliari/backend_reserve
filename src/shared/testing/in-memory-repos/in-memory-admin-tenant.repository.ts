import {
  IAdminTenantRepository,
  IAssignAdminTenant,
} from '../../../modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';
import { EAdminRole } from '../../../modules/zarp-auth/domain/enums/admin-role.enum';

interface StoredAdminTenant {
  id: number;
  admin_id: number;
  tenant_id: number;
  role: EAdminRole;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * In-memory fake implementation of IAdminTenantRepository for unit tests.
 * Provides a controlled, synchronous data store that can be pre-populated.
 */
export class InMemoryAdminTenantRepository implements IAdminTenantRepository {
  private records: StoredAdminTenant[] = [];
  private idCounter = 1;

  async assign(data: IAssignAdminTenant): Promise<StoredAdminTenant> {
    const existing = this.records.find(
      (r) => r.admin_id === data.admin_id && r.tenant_id === data.tenant_id,
    );

    if (existing) {
      existing.active = true;
      if (data.role) existing.role = data.role;
      existing.updated_at = new Date();
      return { ...existing };
    }

    const record: StoredAdminTenant = {
      id: this.idCounter++,
      admin_id: data.admin_id,
      tenant_id: data.tenant_id,
      role: data.role ?? EAdminRole.manager,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.records.push(record);
    return { ...record };
  }

  async unassign(adminId: number, tenantId: number): Promise<void> {
    const record = this.records.find(
      (r) => r.admin_id === adminId && r.tenant_id === tenantId,
    );
    if (record) {
      record.active = false;
      record.updated_at = new Date();
    }
  }

  async findTenantsByAdminId(adminId: number): Promise<any[]> {
    return this.records
      .filter((r) => r.admin_id === adminId && r.active)
      .map((r) => ({ id: r.tenant_id }));
  }

  async findAdminsByTenantId(tenantId: number): Promise<any[]> {
    return this.records
      .filter((r) => r.tenant_id === tenantId && r.active)
      .map((r) => ({ id: r.admin_id, role: r.role }));
  }

  async isAdminInTenant(adminId: number, tenantId: number): Promise<boolean> {
    const record = this.records.find(
      (r) => r.admin_id === adminId && r.tenant_id === tenantId,
    );
    return record !== null && record !== undefined && record.active;
  }

  async findRoleInTenant(
    adminId: number,
    tenantId: number,
  ): Promise<EAdminRole | null> {
    const record = this.records.find(
      (r) => r.admin_id === adminId && r.tenant_id === tenantId,
    );

    if (!record || !record.active) {
      return null;
    }

    return record.role;
  }

  async updateRole(adminId: number, tenantId: number, role: EAdminRole): Promise<any> {
    const record = this.records.find(
      (r) => r.admin_id === adminId && r.tenant_id === tenantId,
    );

    if (!record) {
      throw new Error('Admin-Tenant relation not found');
    }

    record.role = role;
    record.updated_at = new Date();
    return { ...record };
  }

  /** Test helper: seed a record directly */
  seed(data: {
    admin_id: number;
    tenant_id: number;
    role?: EAdminRole;
    active?: boolean;
  }): void {
    this.records.push({
      id: this.idCounter++,
      admin_id: data.admin_id,
      tenant_id: data.tenant_id,
      role: data.role ?? EAdminRole.manager,
      active: data.active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /** Test helper: reset all records */
  clear(): void {
    this.records = [];
    this.idCounter = 1;
  }
}
