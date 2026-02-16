import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/shared/auth/decorators/roles.decorator';
import { EAdminRole } from '@/modules/zarp-auth/domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '@/modules/zarp-auth/domain/interfaces';

/**
 * Guard that checks if the authenticated admin has the required role(s).
 * Must be used AFTER AdminJwtGuard so that `request.admin_id` is available.
 *
 * Usage:
 * @Roles(EAdminRole.super_admin)
 * @UseGuards(AdminJwtGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
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
    const adminId: number = request.admin_id;

    if (!adminId) {
      throw new ForbiddenException('Admin identity not found in request');
    }

    const admin = await this.adminRepository.selectById(adminId);

    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    if (!requiredRoles.includes(admin.role as EAdminRole)) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }

    // Attach role to request for downstream use
    request.admin_role = admin.role;

    return true;
  }
}
