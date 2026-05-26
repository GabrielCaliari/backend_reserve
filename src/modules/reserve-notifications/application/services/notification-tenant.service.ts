import { Injectable, Inject } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
  NOTIFICATION_RECEIPT_REPOSITORY,
  INotificationReceiptRepository,
} from '../../domain/interfaces';

@Injectable()
export class NotificationTenantService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
  ) {}

  async listForTenant(tenantId: string, adminId: string, page: number, limit: number) {
    return this.receiptRepo.findForTenant(tenantId, adminId, page, limit);
  }

  async markAsViewed(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    await this.receiptRepo.upsertForAdmin(notificationId, tenantId, adminId);
    await this.receiptRepo.upsertTenantAggregate(notificationId, tenantId);
  }

  async getUnreadCount(tenantId: string, adminId: string): Promise<number> {
    return this.receiptRepo.countUnread(tenantId, adminId);
  }
}
