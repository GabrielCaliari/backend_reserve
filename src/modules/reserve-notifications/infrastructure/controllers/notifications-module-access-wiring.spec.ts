import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { NotificationController } from './notification.controller';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationTenantController } from './notification-tenant.controller';

const GATED_CONTROLLERS = [NotificationTenantController, NotificationSettingsController];

describe('reserve-notifications (notifications): ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(notifications) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('notifications');
  });

  it.each(GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  // ModuleAccessGuard le request.tenant_id; sem TenantGuard antes dele o guard
  // lanca erro em vez de gatear. A ordem e parte do contrato, nao um detalhe.
  it.each(GATED_CONTROLLERS)('%p roda TenantGuard antes de ModuleAccessGuard', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards.indexOf(TenantGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(ModuleAccessGuard));
  });

  // Superficie de plataforma: CRUD de rascunhos de notificacao do super_admin,
  // sem tenant nenhum na request. ModuleAccessGuard ja libera super_admin, entao
  // gatear aqui so adicionaria um TenantGuard impossivel de satisfazer.
  it('NotificationController (plataforma/super_admin) fica fora do gate por nao ter tenant', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, NotificationController)).toBeUndefined();
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, NotificationController) ?? [];
    expect(guards).not.toContain(ModuleAccessGuard);
  });
});
