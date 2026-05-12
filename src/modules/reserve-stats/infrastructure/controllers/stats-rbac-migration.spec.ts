import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { StatsDashboardController } from './stats-dashboard.controller';
import { StatsIntegrationController } from './stats-integration.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-stats RBAC migration', () => {
  it('StatsDashboardController — per-tenant routes require metrics.dashboard.read', () => {
    expect(permissionsOf(StatsDashboardController, 'getDashboard')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getDashboardByTenant')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getModuleMetrics')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getTimeSeries')).toEqual(['metrics.dashboard.read']);
  });

  it('StatsDashboardController — global route requires the zero-grant metrics.dashboard.global.read', () => {
    expect(permissionsOf(StatsDashboardController, 'getGlobalDashboard')).toEqual([
      'metrics.dashboard.global.read',
    ]);
  });

  it('StatsDashboardController.listAvailableIntegrations requires metrics.integrations.read', () => {
    expect(permissionsOf(StatsDashboardController, 'listAvailableIntegrations')).toEqual([
      'metrics.integrations.read',
    ]);
  });

  it('StatsIntegrationController — reads vs manage split', () => {
    expect(permissionsOf(StatsIntegrationController, 'list')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'listProviders')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'getById')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'create')).toEqual(['metrics.integrations.manage']);
    expect(permissionsOf(StatsIntegrationController, 'update')).toEqual(['metrics.integrations.manage']);
    expect(permissionsOf(StatsIntegrationController, 'delete')).toEqual(['metrics.integrations.manage']);
  });
});
