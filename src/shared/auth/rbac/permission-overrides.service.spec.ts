import { PermissionOverridesService } from './permission-overrides.service';

describe('PermissionOverridesService', () => {
  const rows = [
    { effect: 'grant', Permission: { name: 'billing-config.manage' } },
    { effect: 'deny', Permission: { name: 'leads.delete' } },
  ];
  let findMany: jest.Mock;
  let service: PermissionOverridesService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue(rows);
    service = new PermissionOverridesService({ adminPermissionOverride: { findMany } } as any);
  });

  it('splits rows into grants and denies', async () => {
    const result = await service.getForAdmin('adm1', 'ten1');
    expect([...result.grants]).toEqual(['billing-config.manage']);
    expect([...result.denies]).toEqual(['leads.delete']);
  });

  it('queries by admin_id and tenant_id (snake_case)', async () => {
    await service.getForAdmin('adm1', 'ten1');
    expect(findMany).toHaveBeenCalledWith({
      where: { admin_id: 'adm1', tenant_id: 'ten1' },
      select: { effect: true, Permission: { select: { name: true } } },
    });
  });

  it('reads the database on every call — no caching', async () => {
    await service.getForAdmin('adm1', 'ten1');
    await service.getForAdmin('adm1', 'ten1');
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
