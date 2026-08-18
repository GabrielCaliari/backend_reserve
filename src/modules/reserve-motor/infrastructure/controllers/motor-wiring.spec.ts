import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { MotorRoomTypeController } from './motor-room-type.controller';
import { MotorUnitController } from './motor-unit.controller';
import { MotorDailyInventoryController } from './motor-daily-inventory.controller';
import { MotorTarifaController } from './motor-tarifa.controller';
import { MotorReservationController } from './motor-reservation.controller';
import { MotorBlockController } from './motor-block.controller';
import { MotorCalendarController } from './motor-calendar.controller';
import { MotorBotController } from './motor-bot.controller';
import { MotorChannelController } from './motor-channel.controller';
import { Beds24WebhookController } from './beds24-webhook.controller';

const ADMIN_CONTROLLERS = [
  MotorRoomTypeController,
  MotorUnitController,
  MotorDailyInventoryController,
  MotorTarifaController,
  MotorReservationController,
  MotorBlockController,
  MotorCalendarController,
  MotorChannelController,
];

function classGuards(target: unknown): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA, target as object) ?? [];
}

describe('reserve-motor: wiring dos guards', () => {
  it.each(ADMIN_CONTROLLERS)('%p carrega @RequiresModule(motor) na classe', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('motor');
  });

  // ModuleAccessGuard le request.tenant_id; sem TenantGuard antes ele lanca
  // erro em vez de gatear. A ordem e parte do contrato, nao um detalhe.
  it.each(ADMIN_CONTROLLERS)('%p roda TenantGuard antes de ModuleAccessGuard', (Controller) => {
    const guards = classGuards(Controller);
    expect(guards.indexOf(TenantGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(ModuleAccessGuard));
  });

  it.each(ADMIN_CONTROLLERS)('%p roda PermissionsGuard por ultimo', (Controller) => {
    const guards = classGuards(Controller);
    expect(guards[guards.length - 1]).toBe(PermissionsGuard);
  });

  it('MotorBotController (API por chave do bot) fica fora do gate de modulo', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, MotorBotController)).toBeUndefined();
  });

  // Rota publica por design: o Beds24 nao autentica por JWT — o gate real e o
  // x-webhook-secret por tenant, comparado timing-safe no ChannelInboundService.
  it('Beds24WebhookController (inbound das OTAs) fica fora do gate de modulo', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Beds24WebhookController)).toBeUndefined();
  });
});
