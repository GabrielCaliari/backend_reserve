import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationEventService } from './notification-event.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/interfaces';
import { NOTIFICATION_EVENTS, CRON_KEYS } from '../../domain/constants/notification-events';

@Injectable()
export class NotificationSchedulerService {
  constructor(
    private readonly eventService: NotificationEventService,
    private readonly settingsService: NotificationSettingsService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
  ) {}

  @Cron('0 9 * * *')
  async checkExpiringSubscriptions() {
    const tenantIds = await this.notifRepo.findAllActiveTenantIds();
    for (const tenantId of tenantIds) {
      const enabled = await this.settingsService.isCronEnabled(tenantId, CRON_KEYS.SUBSCRIPTION_EXPIRY_CHECK);
      if (enabled) {
        await this.eventService.dispatch(NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRING, tenantId);
      }
    }
  }

  @Cron('0 10 * * *')
  async checkExpiredSubscriptions() {
    const tenantIds = await this.notifRepo.findAllActiveTenantIds();
    for (const tenantId of tenantIds) {
      const enabled = await this.settingsService.isCronEnabled(tenantId, CRON_KEYS.SUBSCRIPTION_EXPIRED_CHECK);
      if (enabled) {
        await this.eventService.dispatch(NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRED, tenantId);
      }
    }
  }
}
