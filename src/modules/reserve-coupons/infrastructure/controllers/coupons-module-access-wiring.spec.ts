import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { AdminCouponsController } from './admin-coupons.controller';
import { PublicCouponsController } from './public-coupons.controller';

const GATED_CONTROLLERS = [AdminCouponsController];

describe('reserve-coupons (coupons): ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(coupons) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('coupons');
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

  // Rota de resgate/validacao publica do site final: @Public(), sem contexto de
  // tenant administrativo. Fica de fora por definicao (gateable-modules.ts).
  it('PublicCouponsController continua @Public() e sem @RequiresModule', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicCouponsController)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, PublicCouponsController)).toBeUndefined();
  });
});
