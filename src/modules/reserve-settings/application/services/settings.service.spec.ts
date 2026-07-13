import { ForbiddenSettingError, UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { InvalidSettingValueError } from '../../domain/exceptions/settings.errors';
import { SettingsRegistry } from '../../infrastructure/registry/settings-registry';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let repository: {
    findByTenantAndModule: jest.Mock;
    findOne: jest.Mock;
    upsert: jest.Mock;
  };
  let service: SettingsService;

  beforeEach(() => {
    repository = {
      findByTenantAndModule: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    service = new SettingsService(repository as any, new SettingsRegistry());
  });

  it('returns the registry default when no row is stored', async () => {
    await expect(service.get<boolean>('t-1', 'notifications', 'emailEnabled')).resolves.toBe(true);
    expect(repository.findOne).toHaveBeenCalledWith('t-1', 'notifications', 'email_enabled');
  });

  it('returns the stored value when a row exists', async () => {
    repository.findOne.mockResolvedValue({ value: false });
    await expect(service.get<boolean>('t-1', 'notifications', 'emailEnabled')).resolves.toBe(false);
  });

  it('rejects an unknown key on read', async () => {
    await expect(service.get('t-1', 'notifications', 'nope')).rejects.toThrow(UnknownSettingError);
  });

  it('merges defaults with stored rows and exposes camelCase keys', async () => {
    repository.findByTenantAndModule.mockResolvedValue([{ key: 'inapp_enabled', value: false }]);

    await expect(service.getModule('t-1', 'notifications')).resolves.toEqual({
      emailEnabled: true,
      inappEnabled: false,
      eventSettings: {},
      contactEmail: '',
      contactEmailEvents: [],
    });
  });

  it('rejects an unknown module', async () => {
    await expect(service.getModule('t-1', 'nope')).rejects.toThrow(UnknownSettingError);
  });

  it('writes a tenant-scoped setting using the snake_case storage key', async () => {
    await service.set('t-1', 'notifications', 'emailEnabled', false, 'admin-9');

    expect(repository.upsert).toHaveBeenCalledWith(
      't-1',
      'notifications',
      'email_enabled',
      false,
      'admin-9',
    );
  });

  it('refuses to write a superadmin-scoped setting at tenant scope', async () => {
    await expect(
      service.set('t-1', 'platform', 'module.cms.enabled', false, 'admin-9'),
    ).rejects.toThrow(ForbiddenSettingError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('allows the superadmin path to write a superadmin-scoped setting', async () => {
    await service.setAsSuperadmin('t-1', 'platform', 'module.cms.enabled', false, 'admin-9');

    expect(repository.upsert).toHaveBeenCalledWith(
      't-1',
      'platform',
      'module.cms.enabled',
      false,
      'admin-9',
    );
  });

  it('validates the value against the definition before writing', async () => {
    await expect(
      service.set('t-1', 'notifications', 'emailEnabled', 'yes', 'admin-9'),
    ).rejects.toThrow(InvalidSettingValueError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('describes every module with value, default, type, scope and description', async () => {
    const described = await service.describeAll('t-1');

    expect(Object.keys(described).sort()).toEqual(['email', 'notifications', 'platform']);
    expect(described.notifications.emailEnabled).toEqual({
      value: true,
      default: true,
      type: 'boolean',
      scope: 'tenant',
      description: 'Send notification emails to tenant admins',
    });
  });
});
