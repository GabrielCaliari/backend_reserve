import { TenantType } from '../../../../shared/auth/constants/tenant-type';

export type TenantModulePolicySource = 'master' | 'tenantOverride' | 'tenantTypePolicy';

export interface TenantModulePolicyResolution {
  enabled: boolean;
  source: TenantModulePolicySource;
}

/**
 * Pure resolution rule, no I/O. Order of precedence:
 * 1. MASTER tenant type: always enabled, ignores every override.
 * 2. Explicit tenant override (TenantSetting platform.module.<name>.enabled).
 * 3. TenantTypeModulePolicy row for this tenant type; absent row defaults true.
 *
 * The Reserve catalog has no legacy-module carve-out (unlike Zarp's
 * LEGACY_MODULES) — GATEABLE_MODULES only lists modules that are actually
 * gateable today, so there is nothing to force-disable ahead of MASTER.
 */
export function resolveTenantModulePolicy(input: {
  tenantType: TenantType;
  tenantOverride?: boolean;
  typePolicy?: boolean;
}): TenantModulePolicyResolution {
  if (input.tenantType === 'MASTER') {
    return { enabled: true, source: 'master' };
  }

  if (input.tenantOverride !== undefined) {
    return { enabled: input.tenantOverride, source: 'tenantOverride' };
  }

  return { enabled: input.typePolicy ?? true, source: 'tenantTypePolicy' };
}
