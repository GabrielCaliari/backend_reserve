import { SettingDefinition } from '../../domain/entities/setting-definition';

export const EMAIL_SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    module: 'email',
    key: 'smtp_server_id',
    type: 'string',
    default: '',
    scope: 'tenant',
    description: 'SMTP server id used for tenant email sends',
  },
  {
    module: 'email',
    key: 'sending_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description:
      'Master switch for outbound email (campaigns and event notifications). When off, sends are deferred, not dropped.',
  },
];
