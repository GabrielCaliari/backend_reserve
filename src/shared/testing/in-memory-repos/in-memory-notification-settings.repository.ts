import { INotificationSettingsRepository, IUpdateNotificationSettings } from '../../../modules/reserve-notifications/domain/interfaces';

export class InMemoryNotificationSettingsRepository implements INotificationSettingsRepository {
  private records: any[] = [];
  private idCounter = 1;

  async findByTenantId(tenantId: string): Promise<any | null> {
    return this.records.find(r => r.tenant_id === tenantId) ?? null;
  }

  async upsert(tenantId: string, data: IUpdateNotificationSettings): Promise<any> {
    const existing = this.records.find(r => r.tenant_id === tenantId);
    if (existing) {
      Object.assign(existing, data, { updated_at: new Date() });
      return { ...existing };
    }
    const record = {
      id: String(this.idCounter++),
      tenant_id: tenantId,
      email_enabled: true,
      inapp_enabled: true,
      event_settings: {},
      cron_settings: {},
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.records.push(record);
    return { ...record };
  }

  clear(): void {
    this.records = [];
    this.idCounter = 1;
  }
}
