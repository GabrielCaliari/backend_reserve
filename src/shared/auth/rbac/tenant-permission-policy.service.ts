import { Injectable } from '@nestjs/common';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PermissionsService } from './permissions.service';
import { PermissionOverridesService } from './permission-overrides.service';
import { applyOverrides } from './apply-overrides';

/**
 * Fachada de resolução de permissões efetivas (papel + overrides) para um
 * admin dentro de um tenant. Adicionada na Fase 3 (2026-08-04): a Fase 2
 * (docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md, Global
 * Constraints) construiu deliberadamente as duas peças — PermissionsService
 * (cache por papel) e PermissionOverridesService (leitura fresca de
 * overrides) — mas não essa fachada, deixando a composição para quem
 * precisasse fora do PermissionsGuard. A Fase 3 (Global Constraints e Task
 * 20) referencia `TenantPermissionPolicyService.resolve` como se já
 * existisse; esta classe é exatamente a mesma composição que
 * `PermissionsGuard` já faz internamente (getPermissionsForRole +
 * getForAdmin + applyOverrides), extraída para reuso fora do guard — sem
 * lógica nova, sem decisão de produto.
 */
@Injectable()
export class TenantPermissionPolicyService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly permissionOverridesService: PermissionOverridesService,
  ) {}

  async resolve(adminId: string, tenantId: string, role: EAdminRole): Promise<Set<string>> {
    const [held, overrides] = await Promise.all([
      this.permissionsService.getPermissionsForRole(role),
      this.permissionOverridesService.getForAdmin(adminId, tenantId),
    ]);
    return applyOverrides(held, overrides);
  }
}
