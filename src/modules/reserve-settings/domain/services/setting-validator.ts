import { SettingDefinition } from '../entities/setting-definition';
import { InvalidSettingValueError } from '../exceptions/settings.errors';

export function validateSettingValue(def: SettingDefinition, value: unknown): void {
  const fail = (why: string) => {
    throw new InvalidSettingValueError(def.module, def.key, why);
  };

  switch (def.type) {
    case 'boolean':
      if (typeof value !== 'boolean') fail('expected boolean');
      break;
    case 'string':
      if (typeof value !== 'string') fail('expected string');
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) fail('expected number');
      break;
    case 'json':
      if (value === undefined) fail('expected a JSON value');
      break;
  }

  if (def.validate && !def.validate(value)) {
    fail('failed custom validation');
  }
}
