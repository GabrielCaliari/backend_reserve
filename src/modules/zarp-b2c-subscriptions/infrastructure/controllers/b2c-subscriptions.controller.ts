import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { CurrentUser } from '../../../../shared/auth/decorators/current-user.decorator';
import { CreateCheckoutSessionUseCase } from '../../application/use-cases/create-checkout-session.use-case';
import { ListMySubscriptionsUseCase } from '../../application/use-cases/list-my-subscriptions.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { CreateCheckoutSessionDTO } from '../../application/dtos/create-checkout-session.dto';

@ApiTags('B2C Subscriptions')
@Controller('subscriptions')
@UseGuards(UserJwtGuard)
@ApiBearerAuth()
export class B2CSubscriptionsController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly listMySubscriptionsUseCase: ListMySubscriptionsUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session for a product' })
  @ApiResponse({ status: 200, description: 'Checkout URL created' })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 409, description: 'Already subscribed to this product' })
  async createCheckout(
    @CurrentUser('user_id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @Body() dto: CreateCheckoutSessionDTO,
  ) {
    return this.createCheckoutSessionUseCase.execute({ tenantId, userId, priceId: dto.priceId });
  }

  @Get('my')
  @ApiOperation({ summary: 'List my subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions listed' })
  async listMySubscriptions(@CurrentUser('user_id') userId: string) {
    return this.listMySubscriptionsUseCase.execute(userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 400, description: 'Subscription already canceled' })
  async cancelSubscription(
    @CurrentUser('user_id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @Param('id') subscriptionId: string,
  ) {
    await this.cancelSubscriptionUseCase.execute({ tenantId, subscriptionId, userId });
    return { message: 'Subscription will be canceled at the end of the current period' };
  }
}
