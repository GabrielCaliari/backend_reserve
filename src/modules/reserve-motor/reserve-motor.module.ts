import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { AdminJwtGuard } from '../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/auth/guards/permissions.guard';
import { BotEventKeyGuard } from '../reserve-client-portal/infrastructure/guards/bot-event-key.guard';
import { BotKeyProvider } from '../reserve-client-portal/infrastructure/providers/bot-key.provider';
import { RoomTypeService } from './application/services/room-type.service';
import { UnitService } from './application/services/unit.service';
import { DailyInventoryService } from './application/services/daily-inventory.service';
import { TarifaService } from './application/services/tarifa.service';
import { AvailabilityService } from './application/services/availability.service';
import { HoldService } from './application/services/hold.service';
import { ReservationService } from './application/services/reservation.service';
import { BlockService } from './application/services/block.service';
import { CalendarService } from './application/services/calendar.service';
import { MotorRoomTypeController } from './infrastructure/controllers/motor-room-type.controller';
import { MotorUnitController } from './infrastructure/controllers/motor-unit.controller';
import { MotorDailyInventoryController } from './infrastructure/controllers/motor-daily-inventory.controller';
import { MotorTarifaController } from './infrastructure/controllers/motor-tarifa.controller';
import { MotorBotController } from './infrastructure/controllers/motor-bot.controller';
import { MotorReservationController } from './infrastructure/controllers/motor-reservation.controller';
import { MotorBlockController } from './infrastructure/controllers/motor-block.controller';
import { MotorCalendarController } from './infrastructure/controllers/motor-calendar.controller';
import { InventoryMaterializeCronProvider } from './infrastructure/providers/inventory-materialize-cron.provider';
import { HoldExpiryCronProvider } from './infrastructure/providers/hold-expiry-cron.provider';
import { MotorBotEventsProvider } from './infrastructure/providers/motor-bot-events.provider';

/**
 * Motor de Reservas (docs/MOTOR_RESERVAS_RESERVE_MASTER.md).
 * Fonte da verdade de disponibilidade e tarifas. Controllers/providers sao
 * adicionados pelas tasks do plano; este modulo nasce vazio de proposito.
 * AdminJwtGuard precisa do ADMIN_TOKEN_VALIDATOR provido pelo ReserveAuthModule.
 */
@Module({
  imports: [ReserveAuthModule],
  controllers: [
    MotorRoomTypeController,
    MotorUnitController,
    MotorDailyInventoryController,
    MotorTarifaController,
    MotorReservationController,
    MotorBlockController,
    MotorCalendarController,
    MotorBotController,
  ],
  providers: [
    AdminJwtGuard,
    TenantGuard,
    ModuleAccessGuard,
    PermissionsGuard,
    BotEventKeyGuard,
    BotKeyProvider,
    RoomTypeService,
    UnitService,
    DailyInventoryService,
    InventoryMaterializeCronProvider,
    TarifaService,
    AvailabilityService,
    HoldService,
    ReservationService,
    BlockService,
    CalendarService,
    HoldExpiryCronProvider,
    MotorBotEventsProvider,
  ],
})
export class ReserveMotorModule {}
