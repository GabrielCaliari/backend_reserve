import { Body, Controller, Headers, Param, Post, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../../../shared/auth/decorators/public.decorator';
import { PmsBookingWebhookService } from '../../application/services/pms-booking-webhook.service';

/**
 * Canal C do contrato Bot <-> Painel v2. Trafego de terceiro (o bot, via N8N),
 * autenticado por assinatura HMAC do corpo — por isso @Public e sem rate limit,
 * como os demais webhooks.
 */
@SkipThrottle()
@Controller('webhooks/booking')
@Public()
export class PmsBookingWebhookController {
  constructor(private readonly service: PmsBookingWebhookService) {}

  @Post(':clientId')
  async receive(
    @Param('clientId') clientId: string,
    @Headers('x-reserve-signature') signature: string | undefined,
    @Req() request: Request & { rawBody?: Buffer },
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const result = await this.service.receive(clientId, request.rawBody, signature, payload);
    return res.status(result.status).json(result.data);
  }
}
