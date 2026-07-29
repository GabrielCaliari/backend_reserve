import { Controller, Get, INestApplication, UseGuards, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../database/prisma.service';
import { DomainExceptionFilter } from '../../exceptions/domain-exception.filter';
import { GATEABLE_MODULES, GateableModule } from '../constants/gateable-modules';
import { RequiresModule } from '../decorators/requires-module.decorator';
import { ModuleAccessGuard } from './module-access.guard';
import { invalidateModuleAccessCache } from '../module-access.util';

/**
 * End-to-end proof (real HTTP layer, real ModuleAccessGuard, real
 * DomainExceptionFilter) that PATCH /tenants/:tenantId/modules disabling a
 * module actually blocks the routes gated with @RequiresModule(module) — the
 * exact gap this wiring closes. Stands in for AdminJwtGuard/TenantGuard with a
 * fake guard that stamps request.admin_role/tenant_id from headers, since
 * those two guards are unit-tested elsewhere and are not what's under test
 * here; ModuleAccessGuard itself, wired after them in the real chain, is.
 */
@Injectable()
class FakeIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.admin_role = request.headers['x-fake-role'] ?? 'manager';
    request.tenant_id = request.headers['x-fake-tenant-id'] ?? 't-1';
    return true;
  }
}

function buildController(module: GateableModule) {
  @UseGuards(FakeIdentityGuard, ModuleAccessGuard)
  @RequiresModule(module)
  @Controller(`probe-${module}`)
  class ProbeController {
    @Get()
    ping() {
      return { ok: true, module };
    }
  }
  return ProbeController;
}

describe('ModuleAccessGuard (end-to-end, one probe route per gateable module)', () => {
  let app: INestApplication;
  let prisma: { tenant: { findUnique: jest.Mock }; tenantSetting: { findUnique: jest.Mock }; tenantTypeModulePolicy: { findUnique: jest.Mock } };

  beforeAll(async () => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      tenantSetting: { findUnique: jest.fn() },
      tenantTypeModulePolicy: { findUnique: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: GATEABLE_MODULES.map(buildController),
      providers: [
        ModuleAccessGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    invalidateModuleAccessCache();
    prisma.tenant.findUnique.mockReset().mockResolvedValue({ tenant_type: 'COMMON' });
    prisma.tenantTypeModulePolicy.findUnique.mockReset().mockResolvedValue(null);
    prisma.tenantSetting.findUnique.mockReset();
  });

  it.each(GATEABLE_MODULES)('%s: enabled by default (no override row) → 200', async (module) => {
    prisma.tenantSetting.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/probe-${module}`)
      .set('x-fake-tenant-id', 't-1')
      .expect(200, { ok: true, module });
  });

  it.each(GATEABLE_MODULES)('%s: superadmin disables it for the tenant → 403 MODULE_DISABLED', async (module) => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: false });
    const res = await request(app.getHttpServer())
      .get(`/probe-${module}`)
      .set('x-fake-tenant-id', 't-1')
      .expect(403);
    expect(res.body.message).toMatch(new RegExp(`'${module}'.*disabled`, 'i'));
  });

  it.each(GATEABLE_MODULES)('%s: super_admin role bypasses the disabled flag → 200', async (module) => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: false });
    await request(app.getHttpServer())
      .get(`/probe-${module}`)
      .set('x-fake-tenant-id', 't-1')
      .set('x-fake-role', 'super_admin')
      .expect(200, { ok: true, module });
  });

  it.each(GATEABLE_MODULES)('%s: re-enabling after a disable (cache invalidated) → 200 again', async (module) => {
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: false });
    await request(app.getHttpServer()).get(`/probe-${module}`).set('x-fake-tenant-id', 't-1').expect(403);

    // Mirrors ModuleFlagsService.setFlags calling invalidateModuleAccessCache after a write.
    invalidateModuleAccessCache('t-1');
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: true });

    await request(app.getHttpServer())
      .get(`/probe-${module}`)
      .set('x-fake-tenant-id', 't-1')
      .expect(200, { ok: true, module });
  });
});
