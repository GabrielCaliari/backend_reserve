import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../modules/reserve-auth/domain/interfaces';

/**
 * Restricts a route to admins operating within a MASTER-type tenant.
 *
 * Runs AFTER TenantGuard (which resolves and authorizes request.tenant_id).
 * Master authority is a property of the *selected* tenant, never of an
 * arbitrary x-tenant-id: a non-MASTER tenant — even a valid, authorized one —
 * is rejected.
 */
@Injectable()
export class MasterTenantGuard implements CanActivate {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const tenantId: string | undefined = request.tenant_id;
    if (!tenantId) {
      throw new ForbiddenException('Master access requires a resolved tenant');
    }

    const tenant = await this.tenantRepository.selectById(tenantId);
    if (!tenant || tenant.tenant_type !== 'MASTER') {
      throw new ForbiddenException('Master access requires a MASTER tenant');
    }

    request.tenant_type = 'MASTER';
    return true;
  }
}
