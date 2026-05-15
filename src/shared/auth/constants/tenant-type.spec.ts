import { ETenantType } from '../../../generated/prisma/enums';
import {
  DEFAULT_TENANT_TYPE,
  TENANT_TYPES,
  TenantType,
  isTenantType,
} from './tenant-type';

describe('tenant-type constants', () => {
  it('lists exactly the three platform tenant types', () => {
    expect(TENANT_TYPES).toEqual(['MASTER', 'COMMON', 'EDUCATIONAL']);
  });

  it('stays in lockstep with the Prisma ETenantType enum', () => {
    expect([...TENANT_TYPES].sort()).toEqual(Object.values(ETenantType).sort());
  });

  it('defaults to COMMON, matching the column default', () => {
    expect(DEFAULT_TENANT_TYPE).toBe<TenantType>('COMMON');
  });

  it('narrows only known values', () => {
    expect(isTenantType('MASTER')).toBe(true);
    expect(isTenantType('EDUCATIONAL')).toBe(true);
    expect(isTenantType('master')).toBe(false);
    expect(isTenantType(undefined)).toBe(false);
    expect(isTenantType(42)).toBe(false);
  });
});
