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
  'digest.published':       'Seu resumo quinzenal está disponível',
};

/** Cents -> "R$ 1.234,56" (simple, locale-agnostic formatting for email bodies). */
function formatCentsAsBrl(cents: number | undefined): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return 'R$ 0,00';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

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
    case 'digest.published': {
      // §3.7.1: "os números principais vão no corpo do email", não apenas um
      // link para o painel.
      const spend = formatCentsAsBrl(metadata?.spend);
      const conversas = metadata?.conversas ?? 0;
      const costPerConversation = formatCentsAsBrl(metadata?.costPerConversation);
      const periodFrom = metadata?.period_start
        ? formatInTenantTimezone(new Date(metadata.period_start), timezone)
        : formatted;
      const periodTo = metadata?.period_end
        ? formatInTenantTimezone(new Date(metadata.period_end), timezone)
        : formatted;
      return `Seu resumo de ${periodFrom} a ${periodTo} já está disponível: investimento de ${spend}, ${conversas} conversas geradas, custo por conversa de ${costPerConversation}. Acesse o painel para ver a análise completa.`;
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
