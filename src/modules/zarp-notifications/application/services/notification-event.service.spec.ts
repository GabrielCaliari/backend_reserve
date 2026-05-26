import { NotificationEventService } from './notification-event.service';
import { NotificationSettingsService } from './notification-settings.service';
import { InMemoryNotificationRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification.repository';
import { InMemoryNotificationReceiptRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-receipt.repository';
import { InMemoryNotificationSettingsRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-settings.repository';
import { NOTIFICATION_EVENTS } from '../../domain/constants/notification-events';
import { ENotificationType } from '../../domain/enums';

describe('NotificationEventService', () => {
  let service: NotificationEventService;
  let notifRepo: InMemoryNotificationRepository;
  let receiptRepo: InMemoryNotificationReceiptRepository;
  let settingsRepo: InMemoryNotificationSettingsRepository;
  let settingsService: NotificationSettingsService;

  beforeEach(() => {
    notifRepo = new InMemoryNotificationRepository();
    receiptRepo = new InMemoryNotificationReceiptRepository();
    settingsRepo = new InMemoryNotificationSettingsRepository();
    settingsService = new NotificationSettingsService(settingsRepo as any);
    service = new NotificationEventService(notifRepo as any, receiptRepo as any, settingsService);
  });

  afterEach(() => {
    notifRepo.clear();
    receiptRepo.clear();
    settingsRepo.clear();
  });

  it('should create and publish a notification when event is enabled', async () => {
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1', { lead_id: 'lead-abc' });
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe(ENotificationType.event);
    expect(data[0].event_key).toBe(NOTIFICATION_EVENTS.LEAD_CREATED);
    expect(data[0].published_at).not.toBeNull();
  });

  it('should create a receipt for the tenant', async () => {
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1');
    const receipts = receiptRepo.getAll();
    expect(receipts.some((r: any) => r.tenant_id === 'tenant-1')).toBe(true);
  });

  it('should not create notification when event is disabled in settings', async () => {
    await settingsRepo.upsert('tenant-1', { event_settings: { [NOTIFICATION_EVENTS.LEAD_CREATED]: false } });
    await service.dispatch(NOTIFICATION_EVENTS.LEAD_CREATED, 'tenant-1');
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(0);
  });

  it('should warn and no-op on unknown event key', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await service.dispatch('unknown.event' as any, 'tenant-1');
    expect(warnSpy).toHaveBeenCalled();
    const { data } = await notifRepo.findAll({});
    expect(data).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
