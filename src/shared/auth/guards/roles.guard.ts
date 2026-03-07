import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { EAdminRole } from '../../../modules/zarp-auth/domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../../modules/zarp-auth/domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../../modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';

/**
 * Role hierarchy from highest to lowest privilege.
 * Higher-indexed roles include all permissions of lower-indexed roles.
 */
const ROLE_HIERARCHY: EAdminRole[] = [
  EAdminRole.viewer,
  EAdminRole.editor,
  EAdminRole.manager,
  EAdminRole.owner,
  EAdminRole.super_admin,
];

/**
 * Guard that checks if the authenticated admin has the required role(s).
 *
 * Role resolution strategy:
 * 1. super_admin on Admin.role bypasses all checks (full platform access)
 * 2. If `request.tenant_id` is present, uses per-tenant role from AdminTenant.role
 * 3. Otherwise falls back to Admin.role (global role)
 *
 * The guard uses hierarchy-based comparison: if the admin's role is >= the
 * minimum required role in the hierarchy, access is granted.
 *
 * Must be used AFTER AdminJwtGuard so that `request.admin_id` is available.
 *
 * Usage:
 * @Roles(EAdminRole.editor)
 * @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<EAdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required = public for any authenticated admin
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const adminId: string = request.admin_id;

    if (!adminId) {
      throw new ForbiddenException('Admin identity not found in request');
    }

    const admin = await this.adminRepository.selectById(adminId);

    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    // super_admin bypasses all role checks
    if (admin.role === EAdminRole.super_admin) {
      request.admin_role = admin.role;
      request.tenant_role = admin.role;
      return true;
    }

    // Resolve the effective role
    let effectiveRole: EAdminRole = admin.role as EAdminRole;

    // If tenant_id is present, use per-tenant role
    const tenantId: string | undefined = request.tenant_id;
    if (tenantId) {
      const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);

      if (!tenantRole) {
        throw new ForbiddenException('You do not have a role in this tenant');
      }

      effectiveRole = tenantRole;
      request.tenant_role = tenantRole;
    }

    // Check if effective role satisfies any of the required roles using hierarchy
    const effectiveLevel = ROLE_HIERARCHY.indexOf(effectiveRole);
    const hasPermission = requiredRoles.some((required) => {
      // Handle deprecated company_admin as equivalent to manager
      const normalizedRequired =
        required === EAdminRole.company_admin ? EAdminRole.manager : required;
      const requiredLevel = ROLE_HIERARCHY.indexOf(normalizedRequired);
      return effectiveLevel >= requiredLevel;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }

    // Attach roles to request for downstream use
    request.admin_role = admin.role;

    return true;
  }
}
