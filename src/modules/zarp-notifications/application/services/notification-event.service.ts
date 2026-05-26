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
import { formatInTenantTimezone } from '../../../../shared/helpers/format-timezone';

const EVENT_TITLES: Record<string, string> = {
  'lead.created':           'Novo lead cadastrado',
  'subscription.expiring':  'Assinatura vencendo em breve',
  'subscription.expired':   'Assinatura expirada',
};

function buildEventBody(
  eventKey: NotificationEventKey,
  metadata: Record<string, any> | undefined,
  timezone: string,
): string {
  const now = new Date();
  const formatted = formatInTenantTimezone(now, timezone);

  switch (eventKey) {
    case 'lead.created':
      return `Um novo lead foi registrado em sua conta em ${formatted}.`;
    case 'subscription.expiring': {
      const expiresAt = metadata?.expires_at ? formatInTenantTimezone(new Date(metadata.expires_at), timezone) : formatted;
      return `Sua assinatura vence em ${expiresAt}. Renove para manter o acesso.`;
    }
    case 'subscription.expired': {
      const expiredAt = metadata?.expired_at ? formatInTenantTimezone(new Date(metadata.expired_at), timezone) : formatted;
      return `Sua assinatura expirou em ${expiredAt}.`;
    }
    default:
      return EVENT_TITLES[eventKey] ?? eventKey;
  }
}

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

    const timezone = await this.settingsService.getTenantTimezone(tenantId);
    const title = EVENT_TITLES[eventKey] ?? eventKey;
    const body = buildEventBody(eventKey, metadata, timezone);
    const notification = await this.notifRepo.create({
      title,
      body,
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
