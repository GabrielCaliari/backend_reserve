import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../../shared/auth/decorators/public.decorator';
import {
  ChannelInboundService,
  InboundResult,
} from '../../application/services/channel-inbound.service';

/**
 * Webhook inbound do Beds24 (spec §3.3): reservas das OTAs chegam com o JSON
 * completo no corpo. Rota publica por design (Beds24 nao autentica por JWT);
 * a autenticacao e o x-webhook-secret por tenant, comparado timing-safe no
 * service contra MotorChannelSyncState.webhook_secret. Corpo grande coberto
 * por LARGE_BODY_ROUTES (/api/webhooks/) no main.ts.
 */
@Controller('webhooks/beds24')
@Public()
@SkipThrottle()
export class Beds24WebhookController {
  constructor(private readonly inboundService: ChannelInboundService) {}

  @Post(':tenantId')
  @HttpCode(200)
  async handle(
    @Param('tenantId') tenantId: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() payload: Record<string, unknown>,
  ): Promise<InboundResult> {
    return this.inboundService.process(tenantId, secret ?? '', payload ?? {});
  }
}
