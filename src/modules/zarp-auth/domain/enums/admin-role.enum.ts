/**
 * Admin role types for multi-tenant RBAC.
 * Maps to Prisma EAdminRole enum.
 *
 * Role Hierarchy (higher can do everything lower can do):
 * super_admin > owner > manager > editor > viewer
 *
 * - super_admin: Zarp platform operator — full access across all tenants
 * - owner: Tenant owner — full access within assigned tenant
 * - manager: Tenant manager — can manage blogs (create, delete) and articles
 * - editor: Content editor — can create and manage articles and images
 * - viewer: Read-only access to tenant content
 * - company_admin: DEPRECATED — retained for backward compatibility, maps to manager
 */
export enum EAdminRole {
  super_admin = 'super_admin',
  owner = 'owner',
  manager = 'manager',
  editor = 'editor',
  viewer = 'viewer',
  /** @deprecated Use `manager` instead. Retained for backward compatibility. */
  company_admin = 'company_admin',
}
