import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCheckoutSessionUseCase } from '../../application/use-cases/create-checkout-session.use-case';
import { GetTenantSubscriptionUseCase } from '../../application/use-cases/get-tenant-subscription.use-case';
import { GetTenantSubscriptionFromStripeUseCase } from '../../application/use-cases/get-tenant-subscription-from-stripe.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { CreateBillingPortalSessionUseCase } from '../../application/use-cases/create-billing-portal-session.use-case';
import { CreateCheckoutSessionDTO } from '../../application/dtos/create-checkout-session.dto';
import { CancelSubscriptionDTO } from '../../application/dtos/cancel-subscription.dto';
import { CreateBillingPortalSessionDTO } from '../../application/dtos/create-billing-portal-session.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly getTenantSubscriptionUseCase: GetTenantSubscriptionUseCase,
    private readonly getTenantSubscriptionFromStripeUseCase: GetTenantSubscriptionFromStripeUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly createBillingPortalSessionUseCase: CreateBillingPortalSessionUseCase,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
        sessionId: 'cs_test_...',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Tenant already has an active subscription' })
  @ApiResponse({ status: 400, description: 'Invalid price ID or Stripe configuration error' })
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDTO) {
    return this.createCheckoutSessionUseCase.execute(dto);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ 
    summary: 'Get subscription by tenant ID',
    description: 'Fetches subscription data directly from Stripe API, not from local database. This ensures subscriptions created in Stripe Dashboard appear in the application.',
  })
  @ApiResponse({ status: 200, description: 'Subscription found or null' })
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    // CRITICAL FIX: Now fetches from Stripe API instead of local database
    const subscription = await this.getTenantSubscriptionFromStripeUseCase.execute(tenantId);

    if (!subscription) {
      return {
        message: 'No subscription found for this tenant',
        subscription: null,
      };
    }

    return subscription;
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 400, description: 'Subscription is not active' })
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDTO,
  ) {
    return this.cancelSubscriptionUseCase.execute(id, dto);
  }

  @Post('billing-portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Stripe Billing Portal session',
    description:
      'Returns a URL to the Stripe Billing Portal where the customer can manage their ' +
      'subscription, update payment methods, and view invoices. ' +
      'Requires the tenant to have an existing subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing portal session created',
    schema: {
      example: {
        portalUrl: 'https://billing.stripe.com/p/session/...',
        sessionId: 'bps_...',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No subscription found for this tenant' })
  @ApiResponse({ status: 400, description: 'Subscription has no Stripe customer ID' })
  async createBillingPortalSession(@Body() dto: CreateBillingPortalSessionDTO) {
    return this.createBillingPortalSessionUseCase.execute(dto);
  }
}
