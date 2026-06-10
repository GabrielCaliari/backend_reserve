import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { TenantPermissionPolicyService } from './tenant-permission-policy.service';

describe('TenantPermissionPolicyService', () => {
  let getPermissionsForRole: jest.Mock;
  let getForAdmin: jest.Mock;
  let service: TenantPermissionPolicyService;

  beforeEach(() => {
    getPermissionsForRole = jest.fn().mockResolvedValue(new Set(['leads.read', 'leads.update']));
    getForAdmin = jest.fn().mockResolvedValue({ grants: new Set(), denies: new Set() });
    service = new TenantPermissionPolicyService(
      { getPermissionsForRole } as any,
      { getForAdmin } as any,
    );
  });

  it('resolves the permission set for the given role, admin and tenant', async () => {
    const result = await service.resolve('admin-1', 'tenant-1', EAdminRole.manager);
    expect(result).toEqual(new Set(['leads.read', 'leads.update']));
    expect(getPermissionsForRole).toHaveBeenCalledWith(EAdminRole.manager);
    expect(getForAdmin).toHaveBeenCalledWith('admin-1', 'tenant-1');
  });

  it('applies grant overrides on top of the role permissions', async () => {
    getForAdmin.mockResolvedValue({ grants: new Set(['billing-config.manage']), denies: new Set() });
    const result = await service.resolve('admin-1', 'tenant-1', EAdminRole.manager);
    expect(result).toEqual(new Set(['leads.read', 'leads.update', 'billing-config.manage']));
  });

  it('deny overrides win over a role grant', async () => {
    getForAdmin.mockResolvedValue({ grants: new Set(), denies: new Set(['leads.update']) });
    const result = await service.resolve('admin-1', 'tenant-1', EAdminRole.manager);
    expect(result).toEqual(new Set(['leads.read']));
  });
});
