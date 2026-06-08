import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { GATEABLE_MODULES, GateableModule } from '../../../../shared/auth/constants/gateable-modules';
import { resolveModuleEnabled } from '../../../../shared/auth/module-access.util';
import { TenantModulePolicyResolution } from '../../domain/services/tenant-type-policy.resolver';
import { TenantType } from '../../../../shared/auth/constants/tenant-type';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../domain/interfaces/admin.repository.interface';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import { normalizeAdminRole } from '../../../../shared/auth/rbac/permission-matrix';
import { TenantPermissionPolicyService } from '../../../../shared/auth/rbac/tenant-permission-policy.service';

export interface TenantCapabilities {
  tenantId: string;
  tenantType: TenantType;
  isMasterTenant: boolean;
  role: EAdminRole;
  modules: Record<GateableModule, TenantModulePolicyResolution>;
  permissions: string[];
}

@Injectable()
export class GetTenantCapabilitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionPolicy: TenantPermissionPolicyService,
  ) {}

  async execute(adminId: string, tenantId: string): Promise<TenantCapabilities> {
    const [tenant, admin] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, active: true, tenant_type: true },
      }),
      this.adminRepository.selectById(adminId),
    ]);

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.active === false) throw new ForbiddenException('Tenant is inactive');
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    let role: EAdminRole;
    let permissions: string[];

    if (admin.role === EAdminRole.super_admin) {
      role = EAdminRole.super_admin;
      permissions = ['*'];
    } else {
      const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
      if (!tenantRole) throw new ForbiddenException('You do not have a role in this tenant');
      role = normalizeAdminRole(tenantRole);
      permissions = [...(await this.permissionPolicy.resolve(adminId, tenantId, role))].sort();
    }

    const resolvedModules = await Promise.all(
      GATEABLE_MODULES.map(
        async (module) => [module, await resolveModuleEnabled(this.prisma, tenantId, module)] as const,
      ),
    );

    return {
      tenantId,
      tenantType: tenant.tenant_type as TenantType,
      isMasterTenant: tenant.tenant_type === 'MASTER',
      role,
      modules: Object.fromEntries(resolvedModules) as Record<GateableModule, TenantModulePolicyResolution>,
      permissions,
    };
  }
}
