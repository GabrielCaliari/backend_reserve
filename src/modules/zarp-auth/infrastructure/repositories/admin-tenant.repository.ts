import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import {
  IAdminTenantRepository,
  IAssignAdminTenant,
} from '@/modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';

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
        update: { active: true },
        create: {
          admin_id: data.admin_id,
          tenant_id: data.tenant_id,
        },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao associar admin ao tenant.', error);
    }
  }

  async unassign(adminId: number, tenantId: number) {
    try {
      await this.prisma.adminTenant.updateMany({
        where: { admin_id: adminId, tenant_id: tenantId },
        data: { active: false },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao desassociar admin do tenant.', error);
    }
  }

  async findTenantsByAdminId(adminId: number) {
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

  async findAdminsByTenantId(tenantId: number) {
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

  async isAdminInTenant(adminId: number, tenantId: number): Promise<boolean> {
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
}
