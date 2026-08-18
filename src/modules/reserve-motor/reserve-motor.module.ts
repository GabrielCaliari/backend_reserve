import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { AdminJwtGuard } from '../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../shared/auth/guards/tenant.guard';
import { BotEventKeyGuard } from '../reserve-client-portal/infrastructure/guards/bot-event-key.guard';
import { BotKeyProvider } from '../reserve-client-portal/infrastructure/providers/bot-key.provider';
import { AvailabilityService } from './application/services/availability.service';
import { MotorBotController } from './infrastructure/controllers/motor-bot.controller';

/**
 * Motor de Reservas (docs/MOTOR_RESERVAS_RESERVE_MASTER.md).
 * Fonte da verdade de disponibilidade e tarifas. Controllers/providers sao
 * adicionados pelas tasks do plano; este modulo nasce vazio de proposito.
 * AdminJwtGuard precisa do ADMIN_TOKEN_VALIDATOR provido pelo ReserveAuthModule.
 */
@Module({
  imports: [ReserveAuthModule],
  controllers: [MotorBotController],
  providers: [AdminJwtGuard, TenantGuard, AvailabilityService, BotEventKeyGuard, BotKeyProvider],
})
export class ReserveMotorModule {}
