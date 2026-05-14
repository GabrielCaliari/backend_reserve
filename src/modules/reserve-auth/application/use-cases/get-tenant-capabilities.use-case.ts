import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import { normalizeAdminRole } from '../../../../shared/auth/rbac/permission-matrix';
import { PermissionsService } from '../../../../shared/auth/rbac/permissions.service';
import { PermissionOverridesService } from '../../../../shared/auth/rbac/permission-overrides.service';
import { applyOverrides } from '../../../../shared/auth/rbac/apply-overrides';

export interface TenantCapabilities {
  tenantId: string;
  role: EAdminRole;
  permissions: string[];
}

/**
 * Fase 2: devolve só { tenantId, role, permissions } — sem tenantType,
 * isMasterTenant nem modules (Fase 3 estende este mesmo endpoint quando
 * Tenant.tenantType e TenantSetting existirem).
 */
@Injectable()
export class GetTenantCapabilitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionsService: PermissionsService,
    private readonly permissionOverridesService: PermissionOverridesService,
  ) {}

  async execute(adminId: string, tenantId: string): Promise<TenantCapabilities> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, active: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.active === false) throw new ForbiddenException('Tenant is inactive');

    const admin = await this.adminRepository.selectById(adminId);
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    if (admin.role === EAdminRole.super_admin) {
      return { tenantId, role: EAdminRole.super_admin, permissions: ['*'] };
    }

    const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
    if (!tenantRole) throw new ForbiddenException('You do not have a role in this tenant');

    const role = normalizeAdminRole(tenantRole);
    const held = await this.permissionsService.getPermissionsForRole(role);
    const overrides = await this.permissionOverridesService.getForAdmin(adminId, tenantId);
    const effective = applyOverrides(held, overrides);

    return { tenantId, role, permissions: [...effective].sort() };
  }
}
