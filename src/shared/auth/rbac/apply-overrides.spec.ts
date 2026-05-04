import { applyOverrides } from './apply-overrides';

describe('applyOverrides', () => {
  it('adds grants, removes denies, deny wins', () => {
    const held = new Set(['leads.read', 'leads.update']);
    const result = applyOverrides(held, {
      grants: new Set(['billing-config.manage', 'leads.update']),
      denies: new Set(['leads.update']),
    });
    expect(result).toEqual(new Set(['leads.read', 'billing-config.manage']));
  });

  it('no overrides → same set', () => {
    expect(applyOverrides(new Set(['x']), { grants: new Set(), denies: new Set() })).toEqual(new Set(['x']));
  });
});
