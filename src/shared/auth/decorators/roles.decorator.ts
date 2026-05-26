import { SetMetadata } from '@nestjs/common';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific admin roles.
 * Used in conjunction with RolesGuard.
 *
 * @example
 * @Roles(EAdminRole.super_admin)
 * @UseGuards(AdminJwtGuard, RolesGuard)
 * @Get('/super-only')
 * async superOnly() {}
 */
export const Roles = (...roles: EAdminRole[]) => SetMetadata(ROLES_KEY, roles);
