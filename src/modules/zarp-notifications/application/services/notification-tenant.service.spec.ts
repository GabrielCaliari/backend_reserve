import { NotificationTenantService } from './notification-tenant.service';
import { InMemoryNotificationRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification.repository';
import { InMemoryNotificationReceiptRepository } from '../../../../shared/testing/in-memory-repos/in-memory-notification-receipt.repository';

describe('NotificationTenantService', () => {
  let service: NotificationTenantService;
  let notifRepo: InMemoryNotificationRepository;
  let receiptRepo: InMemoryNotificationReceiptRepository;

  beforeEach(() => {
    notifRepo = new InMemoryNotificationRepository();
    receiptRepo = new InMemoryNotificationReceiptRepository();
    service = new NotificationTenantService(notifRepo as any, receiptRepo as any);
  });

  afterEach(() => {
    notifRepo.clear();
    receiptRepo.clear();
  });

  it('should return notifications for a tenant (empty initially)', async () => {
    const result = await service.listForTenant('tenant-1', 'admin-1', 1, 20);
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  it('should mark notification as viewed for admin and update tenant aggregate', async () => {
    await receiptRepo.createManyForTenant('notif-1', ['tenant-1']);
    await service.markAsViewed('notif-1', 'tenant-1', 'admin-1');
    const adminReceipts = receiptRepo.getAll().filter((r: any) => r.admin_id === 'admin-1');
    expect(adminReceipts[0].viewed).toBe(true);
    const aggregateReceipts = receiptRepo.getAll().filter((r: any) => r.admin_id === null);
    expect(aggregateReceipts[0].viewed).toBe(true);
  });

  it('should return unread count of 0 when no admin-level receipts exist', async () => {
    await receiptRepo.createManyForTenant('notif-1', ['tenant-1']);
    const count = await service.getUnreadCount('tenant-1', 'admin-1');
    expect(count).toBe(0);
  });

  it('should count unread receipts correctly after creating admin receipt', async () => {
    receiptRepo.records.push({
      id: '99',
      notification_id: 'notif-1',
      tenant_id: 'tenant-1',
      admin_id: 'admin-1',
      viewed: false,
      first_viewed_at: null,
      last_viewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const count = await service.getUnreadCount('tenant-1', 'admin-1');
    expect(count).toBe(1);
  });
});
