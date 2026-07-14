export const NOTIFICATION_EVENTS = {
  LEAD_CREATED:          'lead.created',
  SUBSCRIPTION_EXPIRING: 'subscription.expiring',
  SUBSCRIPTION_EXPIRED:  'subscription.expired',
  DIGEST_PUBLISHED:      'digest.published',
} as const;

export type NotificationEventKey = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

export const ALL_EVENT_KEYS: NotificationEventKey[] = Object.values(NOTIFICATION_EVENTS);

export const CRON_KEYS = {
  SUBSCRIPTION_EXPIRY_CHECK:  'subscription.expiry_check',
  SUBSCRIPTION_EXPIRED_CHECK: 'subscription.expired_check',
} as const;

export type CronKey = typeof CRON_KEYS[keyof typeof CRON_KEYS];

export const ALL_CRON_KEYS: CronKey[] = Object.values(CRON_KEYS);
