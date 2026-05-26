export const NOTIFICATION_SETTINGS_REPOSITORY = 'NOTIFICATION_SETTINGS_REPOSITORY';

export interface IUpdateNotificationSettings {
  email_enabled?: boolean;
  inapp_enabled?: boolean;
  event_settings?: Record<string, boolean>;
  cron_settings?: Record<string, boolean>;
}

export interface INotificationSettingsRepository {
  findByTenantId(tenantId: string): Promise<any | null>;
  upsert(tenantId: string, data: IUpdateNotificationSettings): Promise<any>;
}
