export type SettingScope = 'tenant' | 'superadmin';
export type SettingType = 'boolean' | 'string' | 'number' | 'json';
export type SettingMergeStrategy = 'replace' | 'shallow_object';

/**
 * A setting exists because it is declared here in code, not because a row
 * exists in the database. Absence of a row means "use `default`".
 *
 * `key` is the storage key and is snake_case; the HTTP contract exposes the
 * camelCase form (SettingsService converts both ways).
 */
export interface SettingDefinition {
  module: string;
  key: string;
  type: SettingType;
  default: unknown;
  scope: SettingScope;
  description: string;
  mergeStrategy?: SettingMergeStrategy;
  validate?: (value: unknown) => boolean;
}
