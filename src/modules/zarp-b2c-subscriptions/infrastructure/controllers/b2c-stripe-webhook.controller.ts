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
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@ApiTags('B2C Webhooks')
@Controller('webhooks/b2c')
export class B2CStripeWebhookController {
  private readonly logger = new Logger(B2CStripeWebhookController.name);

  constructor(
    private readonly processB2CWebhookUseCase: ProcessB2CWebhookUseCase,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint for B2C subscriptions' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid signature or missing data' })
  async handleStripeWebhook(@Req() request: Request): Promise<{ received: boolean }> {
    const signature = request.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (request as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    // 1. Parse event without verifying to extract tenant_id from metadata
    let tempEvent: any;
    try {
      tempEvent = JSON.parse(rawBody.toString());
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    const tenantId =
      tempEvent?.data?.object?.metadata?.tenantId ||
      tempEvent?.data?.object?.metadata?.tenant_id;

    if (!tenantId) {
      throw new BadRequestException('Missing tenantId in event metadata');
    }

    // 2. Get tenant's webhook secret
    const webhookSecret = await this.billingConfigRepo.getStripeWebhookSecret(tenantId);
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured for this tenant');
    }

    // 3. Verify signature using tenant's webhook secret
    let event: Stripe.Event;
    try {
      event = await this.stripeProvider.constructWebhookEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe B2C event: ${event.type} (${event.id}) for tenant ${tenantId}`);

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
