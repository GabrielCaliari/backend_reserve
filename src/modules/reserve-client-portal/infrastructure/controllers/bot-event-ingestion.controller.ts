import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotEventKeyGuard } from '../guards/bot-event-key.guard';
import { BotIngestBearerGuard } from '../guards/bot-ingest-bearer.guard';
import { BotEventIngestionService } from '../../application/services/bot-event-ingestion.service';
import { HandoffSummaryService } from '../../application/services/handoff-summary.service';
import { BotEventBatchDto } from '../../application/dtos/bot-event.dto';

/**
 * Public-by-tenant-key ingestion endpoint (Decisao 14), matching
 * BookingWebhookController's precedent for third-party-authenticated traffic.
 *
 * Autenticado por chave do bot (BotIngestBearerGuard no POST, BotEventKeyGuard
 * no GET de handoff), nao por sessao de admin: nao existe tenant administrativo
 * na request. FORA do gate de client-portal, mesma razao dos webhooks em
 * gateable-modules.ts.
 */
@Controller('ingest/bot-events')
@SkipThrottle()
export class BotEventIngestionController {
  constructor(
    private readonly ingestionService: BotEventIngestionService,
    private readonly handoffSummary: HandoffSummaryService,
  ) {}

  /** Canal A do contrato v2: lote de eventos, 202 com a contagem. */
  @Post()
  @HttpCode(202)
  @UseGuards(BotIngestBearerGuard)
  async ingest(@Req() request: { tenant_id: string }, @Body() dto: BotEventBatchDto) {
    return this.ingestionService.ingestBatch(request.tenant_id, dto.events);
  }

  /**
   * Resumo para nota interna no handoff (benchmark P0-4a). Mesma chave de
   * bot do ingest: o N8N chama no momento de escalar e envia `resumoTexto`
   * a equipe pelo WhatsApp.
   */
  @Get('handoff-summary/:numeroContato')
  @UseGuards(BotEventKeyGuard)
  async handoffSummaryFor(
    @Headers('x-tenant-id') tenantId: string,
    @Param('numeroContato') numeroContato: string,
  ) {
    return this.handoffSummary.build(tenantId, numeroContato);
  }
}
