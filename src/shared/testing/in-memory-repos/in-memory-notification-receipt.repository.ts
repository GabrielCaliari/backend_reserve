import { INotificationReceiptRepository } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationReceiptRepository implements INotificationReceiptRepository {
  public records: any[] = [];
  private idCounter = 1;

  async upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    const existing = this.records.find(
      r => r.notification_id === notificationId && r.tenant_id === tenantId && r.admin_id === adminId
    );
    const now = new Date();
    if (existing) {
      existing.viewed = true;
      existing.last_viewed_at = now;
      if (!existing.first_viewed_at) existing.first_viewed_at = now;
    } else {
      this.records.push({
        id: String(this.idCounter++),
        notification_id: notificationId,
        tenant_id: tenantId,
        admin_id: adminId,
        viewed: true,
        first_viewed_at: now,
        last_viewed_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  async upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void> {
    const existing = this.records.find(
      r => r.notification_id === notificationId && r.tenant_id === tenantId && r.admin_id === null
    );
    const now = new Date();
    if (existing) {
      existing.viewed = true;
      existing.last_viewed_at = now;
      if (!existing.first_viewed_at) existing.first_viewed_at = now;
    } else {
      this.records.push({
        id: String(this.idCounter++),
        notification_id: notificationId,
        tenant_id: tenantId,
        admin_id: null,
        viewed: true,
        first_viewed_at: now,
        last_viewed_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  async findForTenant(tenantId: string, adminId: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const results = this.records.filter(r => r.tenant_id === tenantId && r.admin_id === adminId);
    const total = results.length;
    const data = results.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async countUnread(tenantId: string, adminId: string): Promise<number> {
    return this.records.filter(r => r.tenant_id === tenantId && r.admin_id === adminId && !r.viewed).length;
  }

  async createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void> {
    const now = new Date();
    for (const tenantId of tenantIds) {
      const exists = this.records.find(
        r => r.notification_id === notificationId && r.tenant_id === tenantId && r.admin_id === null
      );
      if (!exists) {
        this.records.push({
          id: String(this.idCounter++),
          notification_id: notificationId,
          tenant_id: tenantId,
          admin_id: null,
          viewed: false,
          first_viewed_at: null,
          last_viewed_at: null,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  getAll(): any[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
    this.idCounter = 1;
  }
}
