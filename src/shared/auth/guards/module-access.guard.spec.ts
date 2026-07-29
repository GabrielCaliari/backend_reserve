import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard } from './module-access.guard';
import { RequiresModule } from '../decorators/requires-module.decorator';
import { ModuleDisabledError } from '../../exceptions/module-disabled.error';
import { invalidateModuleAccessCache } from '../module-access.util';

const contextFor = (request: any, metadata: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  }) as any;

describe('ModuleAccessGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let prisma: any;
  let guard: ModuleAccessGuard;

  beforeEach(() => invalidateModuleAccessCache());

  const setup = (
    metadata: string | undefined,
    tenantRow: unknown = { tenant_type: 'COMMON' },
    settingRow: unknown = null,
  ) => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(metadata) } as any;
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenantRow) },
      tenantSetting: { findUnique: jest.fn().mockResolvedValue(settingRow) },
      tenantTypeModulePolicy: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    guard = new ModuleAccessGuard(reflector, prisma);
  };

  it('passes when no @RequiresModule metadata is present', async () => {
    setup(undefined);
    await expect(guard.canActivate(contextFor({ tenant_id: 't-1' }, undefined))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('super_admin bypasses without touching the flag', async () => {
    setup('cms');
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'super_admin' }, 'cms')),
    ).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('throws misconfiguration when tenant_id is missing from the request', async () => {
    setup('cms');
    await expect(guard.canActivate(contextFor({}, 'cms'))).rejects.toThrow(/must run after/i);
  });

  it('passes when the flag row is absent (default enabled)', async () => {
    setup('cms', { tenant_type: 'COMMON' }, null);
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'manager' }, 'cms')),
    ).resolves.toBe(true);
  });

  it('throws ModuleDisabledError on an explicit false', async () => {
    setup('cms', { tenant_type: 'COMMON' }, { value: false });
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'manager' }, 'cms')),
    ).rejects.toThrow(ModuleDisabledError);
  });
});

describe('RequiresModule decorator', () => {
  it('rejects names outside the catalog at class-load time', () => {
    expect(() => RequiresModule('not-a-module' as any)).toThrow(/not a gateable module/i);
  });
});
