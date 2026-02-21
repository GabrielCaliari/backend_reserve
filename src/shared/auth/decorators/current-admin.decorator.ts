import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EAdminRole } from '../../../modules/zarp-auth/domain/enums/admin-role.enum';

export interface CurrentAdminPayload {
  id: string; // UUID (12-character cuid)
  admin_id: string; // Deprecated: use 'id' instead
  token: string;
  'session-id': number;
  admin_role?: EAdminRole;
  tenant_id?: number;
  /** Per-tenant role resolved by RolesGuard (from AdminTenant.role) */
  tenant_role?: EAdminRole;
}

/**
 * Decorator to extract current admin from request.
 * Used with @UseGuards(AdminJwtGuard).
 * When used with RolesGuard, `admin_role` and `tenant_role` are also available.
 * When used with TenantGuard, `tenant_id` is also available.
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof CurrentAdminPayload | undefined, ctx: ExecutionContext): CurrentAdminPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const admin: CurrentAdminPayload = {
      id: request.admin_id, // Map admin_id to id
      admin_id: request.admin_id, // Keep for backward compatibility
      token: request.token,
      'session-id': request['session-id'],
      admin_role: request.admin_role,
      tenant_id: request.tenant_id,
      tenant_role: request.tenant_role,
    };

    return data ? admin[data] : admin;
  },
);
