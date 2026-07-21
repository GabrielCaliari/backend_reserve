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
import { PrismaService } from '../../../../shared/database/prisma.service';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repo: INotificationSettingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getSettings(tenantId: string) {
    const [existing, tenant] = await Promise.all([
      this.repo.findByTenantId(tenantId),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } }),
    ]);
    const settings = existing ?? await this.repo.upsert(tenantId, {});
    return { ...settings, timezone: tenant?.timezone ?? DEFAULT_TIMEZONE };
  }

  async getTenantTimezone(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    return tenant?.timezone ?? DEFAULT_TIMEZONE;
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

  /**
   * WhatsApp digest notifications (Fase 6 Task 3) are opt-in and default
   * OFF — unlike email/in-app, which default on — since sending one
   * requires a destination number the tenant must explicitly provide.
   */
  async getWhatsAppNotificationSettings(
    tenantId: string,
  ): Promise<{ enabled: boolean; phone: string | null }> {
    const settings = await this.getSettings(tenantId);
    const record = settings as unknown as { whatsapp_enabled?: boolean; whatsapp_phone?: string | null };
    return {
      enabled: record.whatsapp_enabled === true,
      phone: record.whatsapp_phone ?? null,
    };
  }
}
