import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { AdminJwtGuard } from '../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/auth/guards/permissions.guard';
import { RoomTypeService } from './application/services/room-type.service';
import { UnitService } from './application/services/unit.service';
import { MotorRoomTypeController } from './infrastructure/controllers/motor-room-type.controller';
import { MotorUnitController } from './infrastructure/controllers/motor-unit.controller';

/**
 * Motor de Reservas (docs/MOTOR_RESERVAS_RESERVE_MASTER.md).
 * Fonte da verdade de disponibilidade e tarifas. Controllers/providers sao
 * adicionados pelas tasks do plano; este modulo nasce vazio de proposito.
 * AdminJwtGuard precisa do ADMIN_TOKEN_VALIDATOR provido pelo ReserveAuthModule.
 */
@Module({
  imports: [ReserveAuthModule],
  controllers: [MotorRoomTypeController, MotorUnitController],
  providers: [
    AdminJwtGuard,
    TenantGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    RoomTypeService,
    UnitService,
  ],
})
export class ReserveMotorModule {}
