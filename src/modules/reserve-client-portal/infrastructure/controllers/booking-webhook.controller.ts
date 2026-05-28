import { Body, Controller, Headers, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReservationService } from '../../application/services/reservation.service';

@Controller('webhooks/booking-engine')
export class BookingWebhookController {
  constructor(private readonly reservationService: ReservationService) {}

  // Generic webhook: any engine POSTs here
  // Header: x-engine-type (omnibees|stays|foco|generic_webhook)
  @Post(':tenantId')
  async receiveWebhook(
    @Param('tenantId') tenantId: string,
    @Headers('x-webhook-secret') secret: string,
    @Headers('x-engine-type') engineType: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    const result = await this.reservationService.processWebhook(tenantId, secret, payload, engineType);
    return res.status(result.status).json(result.data);
  }
}
