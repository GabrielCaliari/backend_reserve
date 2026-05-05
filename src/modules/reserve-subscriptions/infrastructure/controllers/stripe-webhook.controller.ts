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
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import Stripe from 'stripe';
import { ProcessStripeWebhookUseCase } from '../../application/use-cases/process-stripe-webhook.use-case';
import {
  ITenantBillingConfigRepository,
  TENANT_BILLING_CONFIG_REPOSITORY,
} from '../../domain/interfaces/tenant-billing-config.repository.interface';
import {
  IStripeProvider,
  STRIPE_PROVIDER,
} from '../../domain/interfaces/stripe.provider.interface';
import { Public } from '../../../../shared/auth/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
@SkipThrottle()
@Public()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly processStripeWebhookUseCase: ProcessStripeWebhookUseCase,
    @Inject(TENANT_BILLING_CONFIG_REPOSITORY)
    private readonly billingConfigRepository: ITenantBillingConfigRepository,
    @Inject(STRIPE_PROVIDER)
    private readonly stripeProvider: IStripeProvider,
  ) {}

  /**
   * Tenant-scoped Stripe webhook endpoint.
   *
   * Each tenant configures their Stripe webhook URL as:
   *   https://api.Reserve.com/api/webhooks/stripe/<tenantId>
   *
   * This allows the backend to look up the correct webhook secret
   * per tenant before validating the Stripe signature.
   *
   * Events handled:
   * - checkout.session.completed
   * - customer.subscription.created
   * - customer.subscription.updated
   * - customer.subscription.deleted
   * - invoice.paid
   * - invoice.payment_failed
   */
  @Post('stripe/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint (per-tenant)',
    description:
      'Each tenant must configure their Stripe webhook URL as /api/webhooks/stripe/{tenantId}. ' +
      'The webhook secret is stored per-tenant in TenantBillingConfig and used to validate the signature.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID — used to look up the webhook secret' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature, missing config, or processing error' })
  async handleStripeWebhook(
    @Param('tenantId') tenantId: string,
    @Req() request: Request,
  ): Promise<{ received: boolean }> {
    const signature = request.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      this.logger.error(`[${tenantId}] Missing stripe-signature header`);
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Fetch the per-tenant webhook secret from the database
    const webhookSecret = await this.billingConfigRepository.getStripeWebhookSecret(tenantId);

    if (!webhookSecret) {
      this.logger.error(`[${tenantId}] No webhook secret configured for this tenant`);
      throw new BadRequestException(
        'Stripe webhook secret not configured for this tenant. ' +
          'Configure it via PATCH /api/payments/billing-config.',
      );
    }

    // Get raw body — requires { rawBody: true } in NestFactory.create (main.ts)
    const rawBody = (request as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      this.logger.error(`[${tenantId}] Raw body not available`);
      throw new BadRequestException(
        'Raw body not available. Ensure NestFactory.create is called with { rawBody: true }.',
      );
    }

    // Validate signature using the tenant's own webhook secret via the provider
    let event: Stripe.Event;
    try {
      event = await this.stripeProvider.constructWebhookEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`[${tenantId}] Webhook signature verification failed:`, error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`[${tenantId}] Received Stripe event: ${event.type} (${event.id})`);

    try {
      await this.processStripeWebhookUseCase.execute(event, tenantId);
      return { received: true };
    } catch (error) {
      this.logger.error(`[${tenantId}] Webhook processing failed for event ${event.id}:`, error);
      // Return 400 so Stripe retries the event
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook processing failed',
      );
    }
  }
}
