import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotEventKeyGuard } from '../../../reserve-client-portal/infrastructure/guards/bot-event-key.guard';
import { AvailabilityQueryDto } from '../../application/dtos/availability.dto';
import { AvailabilityService } from '../../application/services/availability.service';

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
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('availability')
  async availability(@Req() req: any, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.search(req.tenant_id, query);
  }
}
