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
import { ProcessB2CWebhookUseCase } from '../../../reserve-b2c-subscriptions/application/use-cases/process-b2c-webhook.use-case';
import { ProcessB2BWebhookUseCase } from '../../../reserve-b2b-payments/application/use-cases/process-b2b-webhook.use-case';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../../reserve-subscriptions/domain/interfaces/tenant-billing-config.repository.interface';

const STRIPE_API_VERSION = '2025-02-24.acacia' as const;

@ApiTags('Unified Webhooks')
@Controller('webhooks/stripe')
export class UnifiedStripeWebhookController {
  private readonly logger = new Logger(UnifiedStripeWebhookController.name);

  constructor(
    private readonly processB2CWebhookUseCase: ProcessB2CWebhookUseCase,
    private readonly processB2BWebhookUseCase: ProcessB2BWebhookUseCase,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepo: ITenantBillingConfigRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unified Stripe webhook endpoint (handles both B2B and B2C)' })
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

    const obj = tempEvent?.data?.object;
    const tenantId =
      obj?.metadata?.tenant_id ||
      obj?.metadata?.tenantId ||
      obj?.subscription_details?.metadata?.tenant_id ||
      obj?.subscription_details?.metadata?.tenantId;

    if (!tenantId) {
      this.logger.warn(
        `Webhook received without tenant_id in metadata. Event type: ${tempEvent?.type}`,
      );
      throw new BadRequestException('Missing tenant_id in event metadata');
    }

    // 2. Get tenant's webhook secret
    const webhookSecret = await this.billingConfigRepo.getStripeWebhookSecret(tenantId);
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured for this tenant');
    }

    // 3. Get tenant's Stripe secret key for constructing event
    const stripeSecretKey = await this.billingConfigRepo.getStripeSecretKey(tenantId);
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe secret key not configured for this tenant');
    }

    // 4. Verify signature using tenant's webhook secret
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(
      `Received Stripe event: ${event.type} (${event.id}) for tenant ${tenantId}`,
    );

    // 5. Route to appropriate handler based on event type
    try {
      const isB2CEvent = await this.isB2CEvent(event);

      if (isB2CEvent) {
        this.logger.log(`Routing to B2C handler: ${event.type}`);
        await this.processB2CWebhookUseCase.execute(event);
      } else {
        this.logger.log(`Routing to B2B handler: ${event.type}`);
        await this.processB2BWebhookUseCase.execute(event);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed for event ${event.id}:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }

  /**
   * Determines if event should be handled by B2C (subscriptions) or B2B (one-time)
   */
  private async isB2CEvent(event: Stripe.Event): Promise<boolean> {
    const eventType = event.type;

    // checkout.session.completed can be both - check mode
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.mode === 'subscription';
    }

    // Subscription events → B2C
    if (
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted' ||
      eventType === 'invoice.paid' ||
      eventType === 'invoice.payment_failed'
    ) {
      return true;
    }

    // Payment intent events → B2B
    if (
      eventType === 'payment_intent.succeeded' ||
      eventType === 'payment_intent.payment_failed'
    ) {
      return false;
    }

    // Default: log and treat as B2B
    this.logger.warn(`Unknown event type: ${eventType}, defaulting to B2B handler`);
    return false;
  }
}
