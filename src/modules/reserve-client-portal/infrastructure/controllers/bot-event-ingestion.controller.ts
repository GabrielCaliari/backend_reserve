import { Body, Controller, Get, Headers, Param, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { BotEventKeyGuard } from '../guards/bot-event-key.guard';
import { BotEventIngestionService } from '../../application/services/bot-event-ingestion.service';
import { HandoffSummaryService } from '../../application/services/handoff-summary.service';
import { BotEventDto } from '../../application/dtos/bot-event.dto';

/**
 * Public-by-tenant-key ingestion endpoint (Decisao 14), matching
 * BookingWebhookController's precedent for third-party-authenticated traffic.
 *
 * Autenticado por chave do bot (BotEventKeyGuard), nao por sessao de admin: nao
 * existe tenant administrativo na request. FORA do gate de client-portal, mesma
 * razao dos webhooks em gateable-modules.ts.
 */
@Controller('ingest/bot-events')
@SkipThrottle()
@UseGuards(BotEventKeyGuard)
export class BotEventIngestionController {
  constructor(
    private readonly ingestionService: BotEventIngestionService,
    private readonly handoffSummary: HandoffSummaryService,
  ) {}

  @Post()
  async ingest(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: BotEventDto,
    @Res() res: Response,
  ) {
    const result = await this.ingestionService.ingest(tenantId, dto);
    return res.status(result.status).send();
  }

  /**
   * Resumo para nota interna no handoff (benchmark P0-4a). Mesma chave de
   * bot do ingest: o N8N chama no momento de escalar e posta `resumoTexto`
   * como nota privada no Chatwoot.
   */
  @Get('handoff-summary/:numeroContato')
  async handoffSummaryFor(
    @Headers('x-tenant-id') tenantId: string,
    @Param('numeroContato') numeroContato: string,
  ) {
    return this.handoffSummary.build(tenantId, numeroContato);
  }
}
