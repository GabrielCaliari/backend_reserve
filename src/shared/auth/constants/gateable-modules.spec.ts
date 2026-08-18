import {
  GATEABLE_MODULES,
  NON_GATEABLE_MODULES,
  isGateableModule,
  moduleFlagKey,
} from './gateable-modules';

describe('GATEABLE_MODULES', () => {
  it('lists exactly the eleven gateable Reserve bounded contexts', () => {
    expect([...GATEABLE_MODULES]).toEqual([
      'cms',
      'leads',
      'mailer',
      'notifications',
      'stats',
      'reports',
      'coupons',
      'payments',
      'products',
      'client-portal',
      'motor',
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(GATEABLE_MODULES).size).toBe(GATEABLE_MODULES.length);
  });

  it('never lists a module whose shutdown locks the admin out', () => {
    // auth: login/session/tenant selection. settings: the only way back on.
    // webhooks: @Public(), no tenant on the request, Stripe reconciliation.
    for (const forbidden of NON_GATEABLE_MODULES) {
      expect(GATEABLE_MODULES).not.toContain(forbidden as never);
    }
    expect([...NON_GATEABLE_MODULES]).toEqual([
      'auth',
      'settings',
      'unified-webhooks',
    ]);
  });

  it('narrows only catalogued names', () => {
    expect(isGateableModule('cms')).toBe(true);
    expect(isGateableModule('client-portal')).toBe(true);
    expect(isGateableModule('auth')).toBe(false);
    expect(isGateableModule('settings')).toBe(false);
    expect(isGateableModule('courses')).toBe(false);
  });

  it('builds a stable platform setting key per module', () => {
    expect(moduleFlagKey('cms')).toBe('module.cms.enabled');
    expect(moduleFlagKey('client-portal')).toBe('module.client-portal.enabled');
  });

  it('keeps every flag key inside the TenantSetting.key VARCHAR(100) budget', () => {
    for (const module of GATEABLE_MODULES) {
      expect(moduleFlagKey(module).length).toBeLessThanOrEqual(100);
    }
  });
});
