import { PrismaTenantSettingRepository } from './prisma-tenant-setting.repository';

describe('PrismaTenantSettingRepository', () => {
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let upsert: jest.Mock;
  let repository: PrismaTenantSettingRepository;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    findUnique = jest.fn().mockResolvedValue(null);
    upsert = jest.fn().mockResolvedValue(undefined);
    repository = new PrismaTenantSettingRepository({
      tenantSetting: { findMany, findUnique, upsert },
    } as any);
  });

  it('reads a module with snake_case filters', async () => {
    findMany.mockResolvedValue([{ key: 'email_enabled', value: true }]);

    await expect(repository.findByTenantAndModule('t-1', 'notifications')).resolves.toEqual([
      { key: 'email_enabled', value: true },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { tenant_id: 't-1', module: 'notifications' },
      select: { key: true, value: true },
    });
  });

  it('reads one key through the composite unique tenant_id_module_key', async () => {
    findUnique.mockResolvedValue({ value: false });

    await expect(repository.findOne('t-1', 'platform', 'module.cms.enabled')).resolves.toEqual({
      value: false,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        tenant_id_module_key: { tenant_id: 't-1', module: 'platform', key: 'module.cms.enabled' },
      },
      select: { value: true },
    });
  });

  it('returns null when the key has no stored row', async () => {
    await expect(repository.findOne('t-1', 'platform', 'module.cms.enabled')).resolves.toBeNull();
  });

  it('upserts with updated_by and snake_case create payload', async () => {
    await repository.upsert('t-1', 'notifications', 'email_enabled', false, 'admin-9');

    expect(upsert).toHaveBeenCalledWith({
      where: {
        tenant_id_module_key: { tenant_id: 't-1', module: 'notifications', key: 'email_enabled' },
      },
      create: {
        tenant_id: 't-1',
        module: 'notifications',
        key: 'email_enabled',
        value: false,
        updated_by: 'admin-9',
      },
      update: { value: false, updated_by: 'admin-9' },
    });
  });

  it('stores a null updated_by when no author is given', async () => {
    await repository.upsert('t-1', 'notifications', 'email_enabled', true);

    expect(upsert.mock.calls[0][0].create.updated_by).toBeNull();
    expect(upsert.mock.calls[0][0].update.updated_by).toBeNull();
  });
});
