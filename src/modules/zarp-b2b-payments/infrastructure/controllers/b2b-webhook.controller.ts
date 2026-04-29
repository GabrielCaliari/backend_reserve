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
import { ProcessB2BWebhookUseCase } from '../../application/use-cases/process-b2b-webhook.use-case';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../zarp-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@ApiTags('B2B Webhooks')
@Controller('webhooks/b2b')
export class B2BWebhookController {
  private readonly logger = new Logger(B2BWebhookController.name);

  constructor(
    private readonly processB2BWebhookUseCase: ProcessB2BWebhookUseCase,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint for B2B one-time payments' })
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

    // 1. Parse without verifying to extract tenant_id from metadata
    let tempEvent: any;
    try {
      tempEvent = JSON.parse(rawBody.toString());
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    // tenant_id can be in different places depending on the event type
    const obj = tempEvent?.data?.object;
    const tenantId =
      obj?.metadata?.tenant_id ||
      obj?.metadata?.tenantId ||
      // For checkout.session.completed, subscription_details may carry it
      obj?.subscription_details?.metadata?.tenant_id ||
      obj?.subscription_details?.metadata?.tenantId;

    if (!tenantId) {
      this.logger.warn(
        `Webhook received without tenant_id in metadata. Event type: ${tempEvent?.type}. ` +
        `Ensure metadata.tenant_id is set when creating Stripe Checkout Sessions.`,
      );
      throw new BadRequestException(
        'Missing tenant_id in event metadata. ' +
        'Ensure metadata: { tenant_id: "<tenantId>" } is passed when creating the checkout session.',
      );
    }

    // 2. Get tenant's stripe secret key and webhook secret
    const [stripeSecretKey, webhookSecret] = await Promise.all([
      this.billingConfigRepo.getStripeSecretKey(tenantId),
      this.billingConfigRepo.getStripeWebhookSecret(tenantId),
    ]);

    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe secret key not configured for this tenant');
    }

    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured for this tenant');
    }

    // 3. Verify signature using tenant's webhook secret and tenant's stripe client
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error('B2B webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe B2B event: ${event.type} (${event.id}) for tenant ${tenantId}`);

    try {
      await this.processB2BWebhookUseCase.execute(event);
      return { received: true };
    } catch (error) {
      this.logger.error(`B2B webhook processing failed for event ${event.id}:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }
}
