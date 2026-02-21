import { InMemoryAdminTenantRepository } from '../../../../shared/testing/in-memory-repos/in-memory-admin-tenant.repository';
import { EAdminRole } from '../enums/admin-role.enum';

describe('InMemoryAdminTenantRepository - findRoleInTenant', () => {
  let repo: InMemoryAdminTenantRepository;

  beforeEach(() => {
    repo = new InMemoryAdminTenantRepository();
  });

  afterEach(() => {
    repo.clear();
  });

  it('should return the role of an active admin in a tenant', async () => {
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.editor });

    const role = await repo.findRoleInTenant('ckl1234abcd5', 10);

    expect(role).toBe(EAdminRole.editor);
  });

  it('should return null when admin is not in the tenant', async () => {
    const role = await repo.findRoleInTenant('ckl1234abcd5', 99);

    expect(role).toBeNull();
  });

  it('should return null when admin-tenant assignment is inactive', async () => {
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.editor, active: false });

    const role = await repo.findRoleInTenant('ckl1234abcd5', 10);

    expect(role).toBeNull();
  });

  it('should return the correct role for different tenants', async () => {
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.editor });
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 20, role: EAdminRole.owner });

    expect(await repo.findRoleInTenant('ckl1234abcd5', 10)).toBe(EAdminRole.editor);
    expect(await repo.findRoleInTenant('ckl1234abcd5', 20)).toBe(EAdminRole.owner);
  });

  it('should return manager as default role when no role is specified', async () => {
    await repo.assign({ admin_id: 'ckl1234abcd5', tenant_id: 10 });

    const role = await repo.findRoleInTenant('ckl1234abcd5', 10);

    expect(role).toBe(EAdminRole.manager);
  });

  it('should return updated role after reassignment', async () => {
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.viewer });

    await repo.assign({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.owner });

    const role = await repo.findRoleInTenant('ckl1234abcd5', 10);
    expect(role).toBe(EAdminRole.owner);
  });

  it('should return null after unassignment', async () => {
    repo.seed({ admin_id: 'ckl1234abcd5', tenant_id: 10, role: EAdminRole.editor });

    await repo.unassign('ckl1234abcd5', 10);

    const role = await repo.findRoleInTenant('ckl1234abcd5', 10);
    expect(role).toBeNull();
  });
});
