import { Body, Controller, Headers, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { BotEventKeyGuard } from '../guards/bot-event-key.guard';
import { BotEventIngestionService } from '../../application/services/bot-event-ingestion.service';
import { BotEventDto } from '../../application/dtos/bot-event.dto';

/**
 * Public-by-tenant-key ingestion endpoint (Decisao 14), matching
 * BookingWebhookController's precedent for third-party-authenticated traffic.
 */
@Controller('ingest/bot-events')
@SkipThrottle()
@UseGuards(BotEventKeyGuard)
export class BotEventIngestionController {
  constructor(private readonly ingestionService: BotEventIngestionService) {}

  @Post()
  async ingest(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: BotEventDto,
    @Res() res: Response,
  ) {
    const result = await this.ingestionService.ingest(tenantId, dto);
    return res.status(result.status).send();
  }
}
