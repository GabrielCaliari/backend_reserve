import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { NotificationController } from './notification.controller';
import { NotificationSettingsController } from './notification-settings.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

// NotificationController aplica @RequirePermissions na CLASSE (cobrindo as
// 6 rotas) — o metadado fica em `target`, não em `target.prototype[method]`
// (mesmo padrão de PostController na Task 9 / EmailCampaignController na Task 12).
function permissionsOfClass(target: any): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target);
}

describe('reserve-notifications RBAC migration', () => {
  it('NotificationController — every route requires notifications.platform.manage (class-level)', () => {
    expect(permissionsOfClass(NotificationController)).toEqual(['notifications.platform.manage']);
  });

  it('NotificationSettingsController — own-tenant routes stay unpermissioned (preserved anomaly)', () => {
    expect(permissionsOf(NotificationSettingsController, 'getOwn')).toBeUndefined();
    expect(permissionsOf(NotificationSettingsController, 'updateOwn')).toBeUndefined();
  });

  it('NotificationSettingsController — cross-tenant routes require notifications.platform.manage', () => {
    expect(permissionsOf(NotificationSettingsController, 'getForTenant')).toEqual([
      'notifications.platform.manage',
    ]);
    expect(permissionsOf(NotificationSettingsController, 'updateForTenant')).toEqual([
      'notifications.platform.manage',
    ]);
  });
});
