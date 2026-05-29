import { GATEABLE_MODULES, moduleFlagKey } from '../../../../shared/auth/constants/gateable-modules';
import { ALL_EVENT_KEYS } from '../../../reserve-notifications/domain/constants/notification-events';
import { UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { SettingsRegistry } from './settings-registry';

describe('SettingsRegistry', () => {
  const registry = new SettingsRegistry();

  it('exposes the platform, notifications and email modules', () => {
    expect(registry.listModules().sort()).toEqual(['email', 'notifications', 'platform']);
  });

  it('registers one superadmin-scoped boolean flag per gateable module', () => {
    const platform = registry.listByModule('platform');
    expect(platform).toHaveLength(GATEABLE_MODULES.length);

    for (const module of GATEABLE_MODULES) {
      const def = registry.get('platform', moduleFlagKey(module));
      expect(def.type).toBe('boolean');
      expect(def.default).toBe(true);
      expect(def.scope).toBe('superadmin');
    }
  });

  it('throws UnknownSettingError for an unregistered key', () => {
    expect(() => registry.get('platform', 'module.courses.enabled')).toThrow(UnknownSettingError);
    expect(() => registry.get('nope', 'whatever')).toThrow(/Unknown setting: nope.whatever/);
  });

  it('registers the notification channel switches as tenant-writable', () => {
    expect(registry.get('notifications', 'email_enabled').scope).toBe('tenant');
    expect(registry.get('notifications', 'inapp_enabled').scope).toBe('tenant');
    expect(registry.get('notifications', 'contact_email').default).toBe('');
  });

  it('validates event_settings against the real Reserve event catalog', () => {
    const def = registry.get('notifications', 'event_settings');
    expect(def.validate!({ [ALL_EVENT_KEYS[0]]: true })).toBe(true);
    expect(def.validate!({ 'not.an.event': true })).toBe(false);
    expect(def.validate!({ [ALL_EVENT_KEYS[0]]: 'yes' })).toBe(false);
    expect(def.validate!([])).toBe(false);
    expect(def.validate!(null)).toBe(false);
  });

  it('validates contact_email_events as a list of known event keys', () => {
    const def = registry.get('notifications', 'contact_email_events');
    expect(def.validate!([ALL_EVENT_KEYS[0]])).toBe(true);
    expect(def.validate!([])).toBe(true);
    expect(def.validate!(['nope'])).toBe(false);
    expect(def.validate!('lead.created')).toBe(false);
  });

  it('registers the email module switches', () => {
    expect(registry.get('email', 'smtp_server_id').type).toBe('string');
    expect(registry.get('email', 'sending_enabled').default).toBe(true);
  });

  it('stores every key in snake_case so storage and contract never diverge', () => {
    for (const module of registry.listModules()) {
      for (const def of registry.listByModule(module)) {
        expect(def.key).not.toMatch(/[A-Z]/);
      }
    }
  });
});
