import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { StatsIntegrationController } from './stats-integration.controller';
import { StatsDashboardController } from './stats-dashboard.controller';

describe('reserve-stats: StatsIntegrationController (class-level)', () => {
  it('carries @RequiresModule(stats) at class level', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, StatsIntegrationController)).toBe('stats');
  });

  it('runs ModuleAccessGuard in its class-level guard chain', () => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, StatsIntegrationController) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });
});

describe('reserve-stats: StatsDashboardController (mixed tenant/global routes, gated per-method)', () => {
  const TENANT_SCOPED_METHODS = ['getDashboard', 'getDashboardByTenant', 'getModuleMetrics', 'getTimeSeries'];
  const GLOBAL_METHODS = ['getGlobalDashboard', 'listAvailableIntegrations'];

  it.each(TENANT_SCOPED_METHODS)('%s carries @RequiresModule(stats) and ModuleAccessGuard', (method) => {
    const handler = StatsDashboardController.prototype[method as keyof typeof StatsDashboardController.prototype];
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, handler)).toBe('stats');
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  // These two routes never run TenantGuard (they are explicitly super_admin,
  // cross-tenant aggregates — "does not require x-tenant-id" per their own
  // ApiOperation docs), so request.tenant_id is never set and they stay
  // ungated for the same reason as the mailer platform-config routes.
  it.each(GLOBAL_METHODS)('%s stays ungated (no TenantGuard, cross-tenant route)', (method) => {
    const handler = StatsDashboardController.prototype[method as keyof typeof StatsDashboardController.prototype];
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, handler)).toBeUndefined();
  });
});
