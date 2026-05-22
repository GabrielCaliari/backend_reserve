/**
 * Platform tenant types. Mirrors the Prisma `ETenantType` enum — the spec
 * asserts both stay in lockstep, so add a value in both places or neither.
 *
 * MASTER      operator tenant: every gateable module is always on
 * COMMON      default commercial tenant
 * EDUCATIONAL reserved for education-shaped tenants (module policy differs)
 */
export const TENANT_TYPES = ['MASTER', 'COMMON', 'EDUCATIONAL'] as const;

export type TenantType = (typeof TENANT_TYPES)[number];

/** Matches the `@default(COMMON)` on Tenant.tenant_type. */
export const DEFAULT_TENANT_TYPE: TenantType = 'COMMON';

export function isTenantType(value: unknown): value is TenantType {
  return typeof value === 'string' && (TENANT_TYPES as readonly string[]).includes(value);
}
