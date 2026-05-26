export const NOTIFICATION_RECEIPT_REPOSITORY = 'NOTIFICATION_RECEIPT_REPOSITORY';

export interface INotificationReceiptRepository {
  upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void>;
  upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void>;
  findForTenant(tenantId: string, adminId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  countUnread(tenantId: string, adminId: string): Promise<number>;
  createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void>;
}
