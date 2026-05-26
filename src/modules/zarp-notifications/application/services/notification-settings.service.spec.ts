import { NotificationSettingsService } from './notification-settings.service';
import { InMemoryNotificationSettingsRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-settings.repository';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  let repo: InMemoryNotificationSettingsRepository;

  beforeEach(() => {
    repo = new InMemoryNotificationSettingsRepository();
    service = new NotificationSettingsService(repo as any);
  });

  afterEach(() => repo.clear());

  it('should create default settings on first access', async () => {
    const settings = await service.getSettings('tenant-1');
    expect(settings.tenant_id).toBe('tenant-1');
    expect(settings.email_enabled).toBe(true);
    expect(settings.inapp_enabled).toBe(true);
  });

  it('should return existing settings without overwriting', async () => {
    await repo.upsert('tenant-1', { email_enabled: false });
    const settings = await service.getSettings('tenant-1');
    expect(settings.email_enabled).toBe(false);
  });

  it('should update settings for a tenant', async () => {
    await service.updateSettings('tenant-1', { email_enabled: false, event_settings: { 'lead.created': false } });
    const settings = await service.getSettings('tenant-1');
    expect(settings.email_enabled).toBe(false);
  });

  it('should reject update with unknown event key', async () => {
    await expect(service.updateSettings('tenant-1', { event_settings: { 'unknown.event': true } }))
      .rejects.toThrow('Invalid event key: unknown.event');
  });

  it('should reject update with unknown cron key', async () => {
    await expect(service.updateSettings('tenant-1', { cron_settings: { 'bad.cron': true } }))
      .rejects.toThrow('Invalid cron key: bad.cron');
  });

  it('isEventEnabled should return true when event key is not set (default on)', async () => {
    const enabled = await service.isEventEnabled('tenant-1', 'lead.created');
    expect(enabled).toBe(true);
  });

  it('isEventEnabled should return false when event is disabled', async () => {
    await repo.upsert('tenant-1', { event_settings: { 'lead.created': false } });
    const enabled = await service.isEventEnabled('tenant-1', 'lead.created');
    expect(enabled).toBe(false);
  });
});
