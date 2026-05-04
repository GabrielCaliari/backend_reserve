import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS, PermissionName } from '../rbac/permission-matrix';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * Restringe uma rota a admins cujo papel efetivo detenha TODAS as
 * permissões listadas. Usar com PermissionsGuard como o ÚLTIMO guard da
 * cadeia (depois de AdminJwtGuard e TenantGuard, se houver):
 * @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 */
export function RequirePermissions(...permissions: PermissionName[]) {
  // Decorators rodam no carregamento da classe: um typo derruba o boot, não uma requisição.
  if (permissions.length === 0) {
    throw new Error('@RequirePermissions precisa de ao menos uma permissão');
  }
  for (const permission of permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(permission)) {
      throw new Error(
        `@RequirePermissions('${permission}') não está declarada — ver shared/auth/rbac/permission-matrix.ts`,
      );
    }
  }
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
}
