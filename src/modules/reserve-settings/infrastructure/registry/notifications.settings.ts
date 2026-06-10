import { ALL_EVENT_KEYS } from '../../../reserve-notifications/domain/constants/notification-events';
import { SettingDefinition } from '../../domain/entities/setting-definition';

const isBooleanRecordWithKeys =
  (allowed: readonly string[]) =>
  (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value as Record<string, unknown>).every(
      ([key, entry]) => allowed.includes(key) && typeof entry === 'boolean',
    );

export const NOTIFICATION_SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    module: 'notifications',
    key: 'email_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description: 'Send notification emails to tenant admins',
  },
  {
    module: 'notifications',
    key: 'inapp_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description: 'Show in-app notifications in the dashboard',
  },
  {
    module: 'notifications',
    key: 'event_settings',
    type: 'json',
    default: {},
    scope: 'tenant',
    description: 'Per-event enable/disable toggles',
    validate: isBooleanRecordWithKeys(ALL_EVENT_KEYS),
  },
  {
    module: 'notifications',
    key: 'contact_email',
    type: 'string',
    default: '',
    scope: 'tenant',
    description: 'Extra contact email for notification copies',
  },
  {
    module: 'notifications',
    key: 'contact_email_events',
    type: 'json',
    default: [],
    scope: 'tenant',
    description: 'Event keys forwarded to the contact email',
    validate: (value) =>
      Array.isArray(value) &&
      value.every(
        (key) => typeof key === 'string' && (ALL_EVENT_KEYS as readonly string[]).includes(key),
      ),
  },
];
