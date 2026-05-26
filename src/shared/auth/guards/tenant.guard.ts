import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ADMIN_REPOSITORY, IAdminRepository, ITenantRepository, TENANT_REPOSITORY } from '../../../modules/reserve-auth/domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../../modules/reserve-auth/domain/interfaces/admin-tenant.repository.interface';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';

function normalizeRole(role: EAdminRole): EAdminRole {
  return role === EAdminRole.company_admin ? EAdminRole.manager : role;
}

/**
 * Guard that validates the admin has access to the requested tenant.
 * Reads tenant_id from:
 *   1. Route param `:tenantId` or `:tenant_id`
 *   2. Request header `x-tenant-id`
 *   3. Request body `tenant_id`
 *
 * Super admins bypass tenant checks.
 * Must be used AFTER AdminJwtGuard.
 *
 * Usage:
 * @UseGuards(AdminJwtGuard, TenantGuard)
 * @Get('/tenants/:tenantId/dashboard')
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const adminId: string = request.admin_id;

    if (!adminId) {
      throw new ForbiddenException('Admin identity not found in request');
    }

    // Resolve tenant ID from multiple sources
    const tenantId = this.resolveTenantId(request);

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required (param, header x-tenant-id, or body tenant_id)');
    }

    const admin = await this.adminRepository.selectById(adminId);

    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    const tenant = await this.tenantRepository.selectById(tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.active === false) {
      throw new ForbiddenException('Tenant is inactive');
    }

    // Super admins can access any tenant
    if (admin.role === EAdminRole.super_admin) {
      request.tenant_id = tenantId;
      request.admin_role = admin.role;
      return true;
    }

    // Company admins must be assigned to the tenant
    const hasAccess = await this.adminTenantRepository.isAdminInTenant(adminId, tenantId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    request.tenant_id = tenantId;
    request.admin_role = normalizeRole(admin.role as EAdminRole);

    return true;
  }

  private resolveTenantId(request: any): string | null {
    // 1. Route param
    const paramId = request.params?.tenantId || request.params?.tenant_id;
    if (paramId) {
      return paramId ? String(paramId) : null;
    }

    // 2. Header
    const headerId = request.headers?.['x-tenant-id'];
    if (headerId) {
      return headerId ? String(headerId) : null;
    }

    // 3. Body
    const bodyId = request.body?.tenant_id;
    if (bodyId) {
      return bodyId ? String(bodyId) : null;
    }

    return null;
  }
}
