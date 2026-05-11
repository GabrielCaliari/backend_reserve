import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AnalyticsReportController } from './analytics-report.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-reports RBAC migration', () => {
  it('AnalyticsReportController — every route requires analytics-reports.manage', () => {
    for (const method of ['create', 'findAll', 'update', 'delete']) {
      expect(permissionsOf(AnalyticsReportController, method)).toEqual(['analytics-reports.manage']);
    }
  });
});
