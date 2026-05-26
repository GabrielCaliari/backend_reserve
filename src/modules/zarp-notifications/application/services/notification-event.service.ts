import { Injectable, Inject } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  INotificationRepository,
  NOTIFICATION_RECEIPT_REPOSITORY,
  INotificationReceiptRepository,
} from '../../domain/interfaces';
import { NotificationSettingsService } from './notification-settings.service';
import { ENotificationType, ENotificationScope } from '../../domain/enums';
import { ALL_EVENT_KEYS, NotificationEventKey } from '../../domain/constants/notification-events';

const EVENT_TITLES: Record<string, string> = {
  'lead.created':           'Novo lead cadastrado',
  'subscription.expiring':  'Assinatura vencendo em breve',
  'subscription.expired':   'Assinatura expirada',
};

@Injectable()
export class NotificationEventService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifRepo: INotificationRepository,
    @Inject(NOTIFICATION_RECEIPT_REPOSITORY)
    private readonly receiptRepo: INotificationReceiptRepository,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async dispatch(eventKey: NotificationEventKey, tenantId: string, metadata?: Record<string, any>): Promise<void> {
    if (!ALL_EVENT_KEYS.includes(eventKey)) {
      console.warn(`[NotificationEventService] Unknown event key: ${eventKey}. Skipping.`);
      return;
    }

    const enabled = await this.settingsService.isEventEnabled(tenantId, eventKey);
    if (!enabled) return;

    const title = EVENT_TITLES[eventKey] ?? eventKey;
    const notification = await this.notifRepo.create({
      title,
      body: title,
      type: ENotificationType.event,
      scope: ENotificationScope.targeted,
      tenant_ids: [tenantId],
      event_key: eventKey,
      metadata,
      send_email: false,
    });

    await this.notifRepo.publish(notification.id);
    await this.receiptRepo.createManyForTenant(notification.id, [tenantId]);
  }
}
