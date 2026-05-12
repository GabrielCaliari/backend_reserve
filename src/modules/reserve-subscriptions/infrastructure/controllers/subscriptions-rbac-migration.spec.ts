import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { TenantBillingConfigController } from './tenant-billing-config.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-subscriptions RBAC migration', () => {
  it('TenantBillingConfigController — read vs manage split', () => {
    expect(permissionsOf(TenantBillingConfigController, 'get')).toEqual(['billing-config.read']);
    expect(permissionsOf(TenantBillingConfigController, 'create')).toEqual(['billing-config.manage']);
    expect(permissionsOf(TenantBillingConfigController, 'update')).toEqual(['billing-config.manage']);
    expect(permissionsOf(TenantBillingConfigController, 'delete')).toEqual(['billing-config.manage']);
  });
});
