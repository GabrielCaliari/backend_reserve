import { SettingDefinition } from '../entities/setting-definition';
import { InvalidSettingValueError } from '../exceptions/settings.errors';
import { validateSettingValue } from './setting-validator';

const def = (over: Partial<SettingDefinition>): SettingDefinition => ({
  module: 'notifications',
  key: 'email_enabled',
  type: 'boolean',
  default: true,
  scope: 'tenant',
  description: 'test',
  ...over,
});

describe('validateSettingValue', () => {
  it('accepts a boolean for a boolean setting', () => {
    expect(() => validateSettingValue(def({ type: 'boolean' }), false)).not.toThrow();
  });

  it('rejects a non-boolean for a boolean setting', () => {
    expect(() => validateSettingValue(def({ type: 'boolean' }), 'false')).toThrow(
      InvalidSettingValueError,
    );
    expect(() => validateSettingValue(def({ type: 'boolean' }), 'false')).toThrow(
      /expected boolean/,
    );
  });

  it('accepts a string for a string setting and rejects other types', () => {
    expect(() => validateSettingValue(def({ type: 'string' }), 'ops@acme.com')).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'string' }), 42)).toThrow(/expected string/);
  });

  it('accepts a finite number and rejects NaN', () => {
    expect(() => validateSettingValue(def({ type: 'number' }), 7)).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'number' }), Number.NaN)).toThrow(
      /expected number/,
    );
    expect(() => validateSettingValue(def({ type: 'number' }), '7')).toThrow(/expected number/);
  });

  it('accepts any defined JSON value, including null and arrays', () => {
    expect(() => validateSettingValue(def({ type: 'json' }), { a: 1 })).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'json' }), [])).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'json' }), null)).not.toThrow();
  });

  it('rejects undefined for a JSON setting', () => {
    expect(() => validateSettingValue(def({ type: 'json' }), undefined)).toThrow(
      /expected a JSON value/,
    );
  });

  it('runs the custom validator after the type check', () => {
    const custom = def({ type: 'string', validate: (v) => (v as string).includes('@') });
    expect(() => validateSettingValue(custom, 'ops@acme.com')).not.toThrow();
    expect(() => validateSettingValue(custom, 'ops')).toThrow(/failed custom validation/);
  });

  it('names the offending module and key in the error message', () => {
    expect(() =>
      validateSettingValue(def({ module: 'platform', key: 'module.cms.enabled' }), 'yes'),
    ).toThrow('Invalid value for platform.module.cms.enabled: expected boolean');
  });
});
