import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { ProcessB2CWebhookUseCase } from '../../application/use-cases/process-b2c-webhook.use-case';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../../zarp-subscriptions/domain/interfaces/stripe.provider.interface';

@ApiTags('B2C Webhooks')
@Controller('webhooks/b2c')
export class B2CStripeWebhookController {
  private readonly logger = new Logger(B2CStripeWebhookController.name);

  constructor(
    private readonly processB2CWebhookUseCase: ProcessB2CWebhookUseCase,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint for B2C subscriptions' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid signature or missing data' })
  async handleStripeWebhook(@Req() request: Request): Promise<{ received: boolean }> {
    const signature = request.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (request as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      this.logger.error('Raw body not available');
      throw new BadRequestException('Raw body not available');
    }

    let event: Stripe.Event;
    try {
      event = await this.stripeProvider.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe event: ${event.type} (${event.id})`);

    try {
      await this.processB2CWebhookUseCase.execute(event);
      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed for event ${event.id}:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }
}
