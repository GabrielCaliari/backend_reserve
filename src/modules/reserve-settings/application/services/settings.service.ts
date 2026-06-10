import { Inject, Injectable } from '@nestjs/common';
import { validateSettingValue } from '../../domain/services/setting-validator';
import {
  ForbiddenSettingError,
  UnknownSettingError,
} from '../../domain/exceptions/settings.errors';
import {
  ITenantSettingRepository,
  TENANT_SETTING_REPOSITORY,
} from '../../domain/interfaces/tenant-setting.repository.interface';
import { SettingsRegistry } from '../../infrastructure/registry/settings-registry';

/** Wire contract is camelCase; storage (and the registry) is snake_case. */
const toStorageKey = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const toContractKey = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

export interface SettingDescriptor {
  value: unknown;
  default: unknown;
  type: string;
  scope: string;
  description: string;
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(TENANT_SETTING_REPOSITORY)
    private readonly repository: ITenantSettingRepository,
    private readonly registry: SettingsRegistry,
  ) {}

  async get<T>(tenantId: string, module: string, key: string): Promise<T> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey); // throws UnknownSettingError
    const row = await this.repository.findOne(tenantId, module, storageKey);
    return (row ? row.value : def.default) as T;
  }

  async getModule(tenantId: string, module: string): Promise<Record<string, unknown>> {
    const defs = this.registry.listByModule(module);
    if (defs.length === 0) throw new UnknownSettingError(module, '*');

    const rows = await this.repository.findByTenantAndModule(tenantId, module);
    const stored = new Map(rows.map((row) => [row.key, row.value]));

    return Object.fromEntries(
      defs.map((def) => [
        toContractKey(def.key),
        stored.has(def.key) ? stored.get(def.key) : def.default,
      ]),
    );
  }

  async set(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey);
    if (def.scope === 'superadmin') throw new ForbiddenSettingError(module, key);
    validateSettingValue(def, value);
    await this.repository.upsert(tenantId, module, storageKey, value, updatedBy);
  }

  async setAsSuperadmin(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey);
    validateSettingValue(def, value);
    await this.repository.upsert(tenantId, module, storageKey, value, updatedBy);
  }

  async describeAll(tenantId: string): Promise<Record<string, Record<string, SettingDescriptor>>> {
    const result: Record<string, Record<string, SettingDescriptor>> = {};

    for (const module of this.registry.listModules()) {
      const merged = await this.getModule(tenantId, module);
      result[module] = Object.fromEntries(
        this.registry.listByModule(module).map((def) => {
          const contractKey = toContractKey(def.key);
          return [
            contractKey,
            {
              value: merged[contractKey],
              default: def.default,
              type: def.type,
              scope: def.scope,
              description: def.description,
            },
          ];
        }),
      );
    }

    return result;
  }
}
