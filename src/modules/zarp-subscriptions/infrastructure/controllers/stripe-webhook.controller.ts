import {
  Controller,
  Post,
  Req,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { ProcessStripeWebhookUseCase } from '../../application/use-cases/process-stripe-webhook.use-case';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';

@ApiTags('Webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly processStripeWebhookUseCase: ProcessStripeWebhookUseCase,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
  ) {}

  /**
   * Tenant-scoped Stripe webhook endpoint.
   *
   * Each tenant configures their Stripe webhook URL as:
   *   https://api.zarp.com/api/webhooks/stripe/<tenantId>
   *
   * This allows the backend to look up the correct webhook secret
   * per tenant before validating the Stripe signature.
   */
  @Post('stripe/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint (per-tenant)',
    description:
      'Each tenant must configure their Stripe webhook URL as /api/webhooks/stripe/{tenantId}. ' +
      'The webhook secret is stored per-tenant in TenantBillingConfig.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID — used to look up the webhook secret' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or missing config' })
  async handleStripeWebhook(
    @Param('tenantId') tenantId: string,
    @Req() request: Request,
  ) {
    const signature = request.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      this.logger.error(`[${tenantId}] Missing stripe-signature header`);
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Fetch the webhook secret for this tenant from the database
    const webhookSecret = await this.billingConfigRepository.getStripeWebhookSecret(tenantId);

    if (!webhookSecret) {
      this.logger.error(`[${tenantId}] No webhook secret configured for this tenant`);
      throw new BadRequestException(
        'Stripe webhook secret not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config.',
      );
    }

    // Get raw body — requires { rawBody: true } in NestFactory.create (main.ts)
    const rawBody = (request as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    // Validate signature using the tenant's own webhook secret
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(webhookSecret, { apiVersion: '2025-02-24.acacia' });
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`[${tenantId}] Webhook signature verification failed:`, error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`[${tenantId}] Received Stripe event: ${event.type} (${event.id})`);

    try {
      await this.processStripeWebhookUseCase.execute(event, tenantId);
      return { received: true };
    } catch (error) {
      this.logger.error(`[${tenantId}] Webhook processing failed:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }
}
