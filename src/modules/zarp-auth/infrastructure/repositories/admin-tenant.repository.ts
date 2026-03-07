import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IAdminTenantRepository,
  IAssignAdminTenant,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

@Injectable()
export default class AdminTenantRepository implements IAdminTenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(data: IAssignAdminTenant) {
    try {
      return await this.prisma.adminTenant.upsert({
        where: {
          admin_id_tenant_id: {
            admin_id: data.admin_id,
            tenant_id: data.tenant_id,
          },
        },
        update: { active: true, ...(data.role ? { role: data.role } : {}) },
        create: {
          admin_id: data.admin_id,
          tenant_id: data.tenant_id,
          ...(data.role ? { role: data.role } : {}),
        },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao associar admin ao tenant.', error);
    }
  }

  async unassign(adminId: string, tenantId: string) {
    try {
      await this.prisma.adminTenant.updateMany({
        where: { admin_id: adminId, tenant_id: tenantId },
        data: { active: false },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao desassociar admin do tenant.', error);
    }
  }

  async findTenantsByAdminId(adminId: string) {
    try {
      const records = await this.prisma.adminTenant.findMany({
        where: { admin_id: adminId, active: true },
        include: { Tenant: true },
      });
      return records.map((r) => r.Tenant);
    } catch (error) {
      throw new RepositoryException('Erro ao buscar tenants do admin.', error);
    }
  }

  async findAdminsByTenantId(tenantId: string) {
    try {
      const records = await this.prisma.adminTenant.findMany({
        where: { tenant_id: tenantId, active: true },
        include: {
          Admin: {
            select: { id: true, name: true, email: true, role: true, active: true },
          },
        },
      });
      return records.map((r) => r.Admin);
    } catch (error) {
      throw new RepositoryException('Erro ao buscar admins do tenant.', error);
    }
  }

  async isAdminInTenant(adminId: string, tenantId: string): Promise<boolean> {
    try {
      const record = await this.prisma.adminTenant.findUnique({
        where: {
          admin_id_tenant_id: {
            admin_id: adminId,
            tenant_id: tenantId,
          },
        },
      });
      return record !== null && record.active;
    } catch (error) {
      throw new RepositoryException('Erro ao verificar associacao admin-tenant.', error);
    }
  }

  async findRoleInTenant(adminId: string, tenantId: string): Promise<EAdminRole | null> {
    try {
      const record = await this.prisma.adminTenant.findUnique({
        where: {
          admin_id_tenant_id: {
            admin_id: adminId,
            tenant_id: tenantId,
          },
        },
        select: { role: true, active: true },
      });

      if (!record || !record.active) {
        return null;
      }

      return record.role as EAdminRole;
    } catch (error) {
      throw new RepositoryException('Erro ao buscar role do admin no tenant.', error);
    }
  }

  async updateRole(adminId: string, tenantId: string, role: EAdminRole) {
    try {
      return await this.prisma.adminTenant.update({
        where: {
          admin_id_tenant_id: {
            admin_id: adminId,
            tenant_id: tenantId,
          },
        },
        data: { role },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao atualizar role do admin no tenant.', error);
    }
  }
}
