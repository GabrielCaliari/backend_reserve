import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../../modules/reserve-auth/domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../../modules/reserve-auth/domain/interfaces/admin-tenant.repository.interface';
import { PermissionsService } from '../rbac/permissions.service';
import { PermissionOverridesService } from '../rbac/permission-overrides.service';
import { applyOverrides } from '../rbac/apply-overrides';
import { normalizeAdminRole } from '../rbac/permission-matrix';

/**
 * Camada de decisão por permissão. O código nunca pergunta "qual é o papel?"
 * — pergunta "esse admin pode fazer essa ação?". Papéis só agrupam permissões.
 *
 * Deve rodar POR ÚLTIMO na cadeia, para que request.admin_id (AdminJwtGuard)
 * e request.tenant_id (TenantGuard) já estejam populados:
 * @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 * @RequirePermissions('leads.delete')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionsService: PermissionsService,
    @Optional()
    private readonly permissionOverridesService?: PermissionOverridesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const adminId: string = request.admin_id;
    if (!adminId) {
      throw new ForbiddenException('Admin identity not found in request');
    }

    const admin = await this.adminRepository.selectById(adminId);
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    if (admin.role === EAdminRole.super_admin) {
      return true;
    }

    let effectiveRole = normalizeAdminRole(admin.role as EAdminRole);
    const tenantId: string | undefined = request.tenant_id;
    if (tenantId) {
      const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
      if (!tenantRole) {
        throw new ForbiddenException('You do not have a role in this tenant');
      }
      effectiveRole = normalizeAdminRole(tenantRole);
    }

    const held = await this.permissionsService.getPermissionsForRole(effectiveRole);
    let effective: ReadonlySet<string> = held;

    if (tenantId && this.permissionOverridesService) {
      const overrides = await this.permissionOverridesService.getForAdmin(adminId, tenantId);
      effective = applyOverrides(held, overrides);
    }

    const missing = required.find((permission) => !effective.has(permission));
    if (missing) {
      throw new ForbiddenException(`Missing required permission: ${missing}`);
    }

    return true;
  }
}
