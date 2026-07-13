import { PrismaService } from '../database/prisma.service';
import { GateableModule, moduleFlagKey } from './constants/gateable-modules';
import { TenantType } from './constants/tenant-type';
import {
  resolveTenantModulePolicy,
  TenantModulePolicyResolution,
} from '../../modules/reserve-auth/domain/services/tenant-type-policy.resolver';

const MODULE_FLAG_CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { resolution: TenantModulePolicyResolution; expiresAt: number }>();

/**
 * Call after any write to a module flag (ModuleFlagsService.setFlags). Without
 * a tenantId it clears everything. TTL covers a missed invalidation.
 */
export function invalidateModuleAccessCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenantId}:`)) cache.delete(key);
  }
}

/** Plain helper (no DI) so guards and background jobs share one read path. */
export async function isModuleEnabled(
  prisma: PrismaService,
  tenantId: string,
  module: GateableModule,
): Promise<boolean> {
  return (await resolveModuleEnabled(prisma, tenantId, module)).enabled;
}

export async function resolveModuleEnabled(
  prisma: PrismaService,
  tenantId: string,
  module: GateableModule,
): Promise<TenantModulePolicyResolution> {
  const key = `${tenantId}:${module}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.resolution;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tenant_type: true },
  });
  const tenantType = (tenant?.tenant_type ?? 'COMMON') as TenantType;

  if (tenantType === 'MASTER') {
    const resolution = resolveTenantModulePolicy({ tenantType: 'MASTER' });
    cache.set(key, { resolution, expiresAt: Date.now() + MODULE_FLAG_CACHE_TTL_MS });
    return resolution;
  }

  const [override, typePolicy] = await Promise.all([
    prisma.tenantSetting.findUnique({
      where: {
        tenant_id_module_key: { tenant_id: tenantId, module: 'platform', key: moduleFlagKey(module) },
      },
      select: { value: true },
    }),
    prisma.tenantTypeModulePolicy.findUnique({
      where: { tenant_type_module_key: { tenant_type: tenantType, module_key: module } },
      select: { enabled: true },
    }),
  ]);

  const resolution = resolveTenantModulePolicy({
    tenantType,
    tenantOverride: typeof override?.value === 'boolean' ? override.value : undefined,
    typePolicy: typePolicy?.enabled,
  });
  cache.set(key, { resolution, expiresAt: Date.now() + MODULE_FLAG_CACHE_TTL_MS });
  return resolution;
}
