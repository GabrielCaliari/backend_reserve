import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { ModuleDisabledError } from '../../exceptions/module-disabled.error';
import { GateableModule } from '../constants/gateable-modules';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';
import { isModuleEnabled } from '../module-access.util';

/**
 * Enforces superadmin module gating. MUST be listed after AdminJwtGuard+TenantGuard
 * (or UserJwtGuard+UserTenantGuard) — it reads request.tenant_id set by those guards.
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<GateableModule | undefined>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!module) return true;

    const request = context.switchToHttp().getRequest();
    if (request.admin_role === 'super_admin') return true;

    const tenantId: string | undefined = request.tenant_id;
    if (!tenantId) {
      throw new Error(
        'ModuleAccessGuard must run after TenantGuard/UserTenantGuard (request.tenant_id missing)',
      );
    }

    if (!(await isModuleEnabled(this.prisma, tenantId, module))) {
      throw new ModuleDisabledError(module);
    }
    return true;
  }
}
