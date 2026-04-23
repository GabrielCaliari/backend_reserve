import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { ProcessStripeWebhookUseCase } from '../../application/use-cases/process-stripe-webhook.use-case';
import { StripeProvider } from '../providers/stripe.provider';

@ApiTags('Webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly processStripeWebhookUseCase: ProcessStripeWebhookUseCase,
    private readonly stripeProvider: StripeProvider,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  @ApiExcludeEndpoint() // Hide from Swagger docs (external endpoint)
  async handleStripeWebhook(@Req() request: Request) {
    const signature = request.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // Get raw body — provided natively by NestJS when { rawBody: true } is set in main.ts
      const rawBody = (request as any).rawBody;

      if (!rawBody) {
        throw new BadRequestException('Raw body not available');
      }

      // Construct and verify event
      const event = await this.stripeProvider.constructWebhookEvent(rawBody, signature);

      this.logger.log(`Received Stripe event: ${event.type} (${event.id})`);

      // Process event
      await this.processStripeWebhookUseCase.execute(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }
}
