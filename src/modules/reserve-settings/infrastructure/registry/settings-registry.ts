import { Injectable } from '@nestjs/common';
import { SettingDefinition } from '../../domain/entities/setting-definition';
import { UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { EMAIL_SETTING_DEFINITIONS } from './email.settings';
import { NOTIFICATION_SETTING_DEFINITIONS } from './notifications.settings';
import { PLATFORM_SETTING_DEFINITIONS } from './platform.settings';

const ALL_DEFINITIONS: SettingDefinition[] = [
  ...PLATFORM_SETTING_DEFINITIONS,
  ...NOTIFICATION_SETTING_DEFINITIONS,
  ...EMAIL_SETTING_DEFINITIONS,
];

/**
 * Single source of truth for what a setting is. A new module registers its own
 * `<module>.settings.ts` file and spreads it into ALL_DEFINITIONS above.
 */
@Injectable()
export class SettingsRegistry {
  private readonly byId = new Map<string, SettingDefinition>();

  constructor() {
    for (const def of ALL_DEFINITIONS) {
      this.byId.set(`${def.module}:${def.key}`, def);
    }
  }

  get(module: string, key: string): SettingDefinition {
    const def = this.byId.get(`${module}:${key}`);
    if (!def) throw new UnknownSettingError(module, key);
    return def;
  }

  listByModule(module: string): SettingDefinition[] {
    return [...this.byId.values()].filter((def) => def.module === module);
  }

  listModules(): string[] {
    return [...new Set([...this.byId.values()].map((def) => def.module))];
  }
}
