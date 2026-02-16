/**
 * Admin role types for multi-tenant RBAC.
 * Maps to Prisma EAdminRole enum.
 *
 * - super_admin: Zarp platform operator — full access across all tenants
 * - company_admin: Client company administrator — scoped to assigned tenants
 */
export enum EAdminRole {
  super_admin = 'super_admin',
  company_admin = 'company_admin',
}
