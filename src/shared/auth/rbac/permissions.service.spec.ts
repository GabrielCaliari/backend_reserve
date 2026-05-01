import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let findMany: jest.Mock;
  let service: PermissionsService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([
      { Permission: { name: 'leads.read' } },
      { Permission: { name: 'cms.article.read' } },
    ]);
    service = new PermissionsService({ rolePermission: { findMany } } as any);
  });

  it('returns the permission names for a role', async () => {
    const permissions = await service.getPermissionsForRole(EAdminRole.viewer);
    expect(permissions.has('leads.read')).toBe(true);
    expect(permissions.has('cms.article.read')).toBe(true);
    expect(permissions.has('leads.delete')).toBe(false);
  });

  it('queries by the requested role', async () => {
    await service.getPermissionsForRole(EAdminRole.manager);
    expect(findMany).toHaveBeenCalledWith({
      where: { role: EAdminRole.manager },
      select: { Permission: { select: { name: true } } },
    });
  });

  it('caches the set between calls for the same role', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    await service.getPermissionsForRole(EAdminRole.viewer);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('caches per role, not globally', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    await service.getPermissionsForRole(EAdminRole.manager);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('normalizes company_admin to manager before querying', async () => {
    await service.getPermissionsForRole(EAdminRole.company_admin);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: EAdminRole.manager } }),
    );
  });

  it('invalidate() forces a re-query on the next call', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    service.invalidate();
    await service.getPermissionsForRole(EAdminRole.viewer);
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
