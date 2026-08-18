import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotEventKeyGuard } from '../../../reserve-client-portal/infrastructure/guards/bot-event-key.guard';
import { AvailabilityQueryDto } from '../../application/dtos/availability.dto';
import { AvailabilityService } from '../../application/services/availability.service';
import { ConfirmHoldDto, CreateHoldDto } from '../../application/dtos/hold.dto';
import { HoldService } from '../../application/services/hold.service';
import { CancelDto, RescheduleDto } from '../../application/dtos/reservation.dto';
import { ReservationService } from '../../application/services/reservation.service';

/**
 * API de maquina do motor, consumida pelo bot via N8N (spec §2).
 * Autenticacao pela MESMA chave do BotIntegrationConfig (x-tenant-id +
 * x-tenant-key) — o guard publica request.tenant_id. Fora do gate de modulo
 * por design, como o BotEventIngestionController (rotas de maquina nao
 * passam por RequiresModule).
 */
@Controller('motor')
@SkipThrottle()
@UseGuards(BotEventKeyGuard)
export class MotorBotController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly holdService: HoldService,
    private readonly reservationService: ReservationService,
  ) {}

  @Get('availability')
  async availability(@Req() req: any, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.search(req.tenant_id, query);
  }

  @Post('holds')
  async createHold(@Req() req: any, @Body() dto: CreateHoldDto) {
    return this.holdService.create(req.tenant_id, dto);
  }

  @Post('holds/:id/release')
  @HttpCode(200)
  async releaseHold(@Req() req: any, @Param('id') id: string) {
    const hold = await this.holdService.release(req.tenant_id, id);
    return { hold_id: hold.id, status: hold.status };
  }

  @Post('holds/:id/confirm')
  @HttpCode(200)
  async confirmHold(@Req() req: any, @Param('id') id: string, @Body() dto: ConfirmHoldDto) {
    return this.holdService.confirm(req.tenant_id, id, dto);
  }

  @Post('reservations/:id/reschedule')
  @HttpCode(200)
  async reschedule(@Req() req: any, @Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.reservationService.reschedule(req.tenant_id, id, dto, 'bot');
  }

  @Post('reservations/:id/cancel')
  @HttpCode(200)
  async cancel(@Req() req: any, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.reservationService.cancel(req.tenant_id, id, dto, 'bot');
  }
}
