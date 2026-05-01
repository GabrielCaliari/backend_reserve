import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PERMISSIONS, ROLE_GRANTS, normalizeAdminRole } from './permission-matrix';

describe('permission-matrix', () => {
  it('every permission name follows the recurso.ação convention', () => {
    for (const name of PERMISSIONS) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/);
    }
  });

  it('has no duplicate permission names', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('every grant references a declared permission', () => {
    for (const grants of Object.values(ROLE_GRANTS)) {
      for (const grant of grants!) {
        expect(PERMISSIONS).toContain(grant);
      }
    }
  });

  it('grants are cumulative up the hierarchy (viewer ⊆ editor ⊆ manager ⊆ owner)', () => {
    const chain = [EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner];
    for (let i = 1; i < chain.length; i++) {
      const lower = new Set(ROLE_GRANTS[chain[i - 1]]);
      const higher = new Set(ROLE_GRANTS[chain[i]]);
      for (const grant of lower) {
        expect(higher.has(grant)).toBe(true);
      }
    }
  });

  it('does not define grants for super_admin (guard bypass) or company_admin (normalized)', () => {
    expect(ROLE_GRANTS[EAdminRole.super_admin]).toBeUndefined();
    expect(ROLE_GRANTS[EAdminRole.company_admin]).toBeUndefined();
  });

  it('normalizeAdminRole maps company_admin to manager and keeps others', () => {
    expect(normalizeAdminRole(EAdminRole.company_admin)).toBe(EAdminRole.manager);
    expect(normalizeAdminRole(EAdminRole.viewer)).toBe(EAdminRole.viewer);
    expect(normalizeAdminRole(EAdminRole.super_admin)).toBe(EAdminRole.super_admin);
  });

  it('zero-grant permissions (super_admin bypass only) have no role entries anywhere', () => {
    const zeroGrant = [
      'admins.deactivate', 'admins.activate', 'admins.delete', 'admins.deletion-status.read',
      'users.update', 'users.deactivate', 'users.delete',
      'tenants.create', 'tenants.read', 'tenants.update', 'tenants.admin.assign',
      'tenants.admin.remove', 'tenants.admin.read', 'tenants.deactivate', 'tenants.activate',
      'tenants.delete', 'tenants.admin.role.update',
      'post.image-generation.manage',
      'mailer.smtp-config.manage', 'mailer.smtp-config.read',
      'notifications.platform.manage',
      'analytics-reports.manage',
      'metrics.dashboard.global.read',
      'hotel-portal.clients.deactivate',
    ];
    for (const permission of zeroGrant) {
      expect(PERMISSIONS).toContain(permission as any);
      for (const role of [EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner]) {
        expect(ROLE_GRANTS[role]).not.toContain(permission as any);
      }
    }
  });

  it('grants admins.create/read/role.update/update at manager, but deactivate/activate/delete stay zero-grant', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.create');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.role.update');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.update');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('admins.create');
  });

  it('preserves the deletion-status anomaly: narrower than the sibling admins.read grant', () => {
    expect(PERMISSIONS).toContain('admins.deletion-status.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('admins.deletion-status.read');
  });

  it('preserves the hotel-portal.clients anomaly: manage is broader than deactivate', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('hotel-portal.clients.manage');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('hotel-portal.clients.deactivate');
    expect(ROLE_GRANTS[EAdminRole.owner]).not.toContain('hotel-portal.clients.deactivate');
  });

  it('preserves the hotel-portal.reports anomaly: publish requires owner, manage requires only manager', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('hotel-portal.reports.manage');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('hotel-portal.reports.publish');
    expect(ROLE_GRANTS[EAdminRole.owner]).toContain('hotel-portal.reports.publish');
  });

  it('grants cms.article.create at editor, cms.blog.create at manager, cms.blog.manage-key at owner', () => {
    expect(ROLE_GRANTS[EAdminRole.editor]).toContain('cms.article.create');
    expect(ROLE_GRANTS[EAdminRole.viewer]).not.toContain('cms.article.create');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('cms.blog.create');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('cms.blog.create');
    expect(ROLE_GRANTS[EAdminRole.owner]).toContain('cms.blog.manage-key');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('cms.blog.manage-key');
  });

  it('grants leads.delete at manager, leads.update at editor', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('leads.delete');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('leads.delete');
    expect(ROLE_GRANTS[EAdminRole.editor]).toContain('leads.update');
    expect(ROLE_GRANTS[EAdminRole.viewer]).not.toContain('leads.update');
  });

  it('billing-config and b2c-fees follow the viewer-read/manager-manage split', () => {
    expect(ROLE_GRANTS[EAdminRole.viewer]).toContain('billing-config.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('billing-config.manage');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('billing-config.manage');
    expect(ROLE_GRANTS[EAdminRole.viewer]).toContain('b2c-fees.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('b2c-fees.manage');
  });
});
