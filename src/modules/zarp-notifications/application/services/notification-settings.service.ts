import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import {
  NOTIFICATION_SETTINGS_REPOSITORY,
  INotificationSettingsRepository,
  IUpdateNotificationSettings,
} from '../../domain/interfaces';
import {
  ALL_EVENT_KEYS,
  ALL_CRON_KEYS,
  NotificationEventKey,
  CronKey,
} from '../../domain/constants/notification-events';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repo: INotificationSettingsRepository,
  ) {}

  async getSettings(tenantId: string) {
    const existing = await this.repo.findByTenantId(tenantId);
    if (existing) return existing;
    return this.repo.upsert(tenantId, {});
  }

  async updateSettings(tenantId: string, data: IUpdateNotificationSettings) {
    if (data.event_settings) {
      for (const key of Object.keys(data.event_settings)) {
        if (!ALL_EVENT_KEYS.includes(key as NotificationEventKey)) {
          throw new BadRequestException(`Invalid event key: ${key}`);
        }
      }
    }
    if (data.cron_settings) {
      for (const key of Object.keys(data.cron_settings)) {
        if (!ALL_CRON_KEYS.includes(key as CronKey)) {
          throw new BadRequestException(`Invalid cron key: ${key}`);
        }
      }
    }
    return this.repo.upsert(tenantId, data);
  }

  async isEventEnabled(tenantId: string, eventKey: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    const eventSettings = (settings.event_settings ?? {}) as Record<string, boolean>;
    return eventSettings[eventKey] !== false;
  }

  async isCronEnabled(tenantId: string, cronKey: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    const cronSettings = (settings.cron_settings ?? {}) as Record<string, boolean>;
    return cronSettings[cronKey] !== false;
  }

  async isEmailEnabled(tenantId: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId);
    return settings.email_enabled !== false;
  }
}
