import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCheckoutSessionUseCase } from '../../application/use-cases/create-checkout-session.use-case';
import { GetTenantSubscriptionUseCase } from '../../application/use-cases/get-tenant-subscription.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { CreateCheckoutSessionDTO } from '../../application/dtos/create-checkout-session.dto';
import { CancelSubscriptionDTO } from '../../application/dtos/cancel-subscription.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly getTenantSubscriptionUseCase: GetTenantSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/...',
        sessionId: 'cs_test_...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tenant already has an active subscription' })
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDTO) {
    return await this.createCheckoutSessionUseCase.execute(dto);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get subscription by tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription found',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    const subscription = await this.getTenantSubscriptionUseCase.execute(tenantId);

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
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDTO,
  ) {
    return await this.cancelSubscriptionUseCase.execute(id, dto);
  }
}
