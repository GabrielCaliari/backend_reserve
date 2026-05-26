import { Controller, Post, Get, Param, Body, UseGuards, Req, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { CurrentUser } from '../../../../shared/auth/decorators/current-user.decorator';
import { OptionalUserGuard } from '../../../../modules/reserve-b2b-payments/infrastructure/guards/optional-user.guard';
import { CreateCheckoutSessionUseCase } from '../../application/use-cases/create-checkout-session.use-case';
import { ListMySubscriptionsUseCase } from '../../application/use-cases/list-my-subscriptions.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { CreateB2CCheckoutSessionDTO } from '../../application/dtos/create-checkout-session.dto';

@ApiTags('B2C Subscriptions')
@Controller('subscriptions')
@ApiHeader({ name: 'x-tenant-id', required: false, description: 'Tenant ID (usado por leads não autenticados)' })
export class B2CSubscriptionsController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly listMySubscriptionsUseCase: ListMySubscriptionsUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
  ) {}

  @Post('checkout')
  @UseGuards(OptionalUserGuard) // Permite leads (sem login) e users autenticados
  @ApiOperation({
    summary: 'Create Stripe checkout session for a product',
    description: `
      Suporta 2 cenários:
      1. User autenticado: envia JWT + session-id, não precisa de leadName/leadEmail
      2. Lead não autenticado: envia leadName, leadEmail e leadPhone no body
    `,
  })
  @ApiResponse({ status: 200, description: 'Checkout URL created' })
  @ApiResponse({ status: 400, description: 'Missing lead data or Stripe not configured' })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 409, description: 'Already subscribed to this product' })
  async createCheckout(
    @Req() req: any,
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Body() dto: CreateB2CCheckoutSessionDTO,
  ) {
    // userId vem do OptionalUserGuard (null se lead)
    const userId: string | undefined = req.user_id ?? undefined;

    // tenantId: do JWT se autenticado, do header se lead
    const tenantId: string = req.tenant_id ?? tenantIdHeader;

    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required for unauthenticated checkout');
    }

    return this.createCheckoutSessionUseCase.execute({
      tenantId,
      userId,
      priceId: dto.priceId,
      leadName: dto.leadName,
      leadEmail: dto.leadEmail,
      leadPhone: dto.leadPhone,
      couponCodes: dto.couponCodes,
    });
  }

  @Get('my')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions listed' })
  async listMySubscriptions(@CurrentUser('user_id') userId: string) {
    return this.listMySubscriptionsUseCase.execute(userId);
  }

  @Post(':id/cancel')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 400, description: 'Subscription already canceled' })
  async cancelSubscription(
    @CurrentUser('user_id') userId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @Param('id') accessId: string,
  ) {
    await this.cancelSubscriptionUseCase.execute({ tenantId, accessId, userId });
    return { message: 'Subscription will be canceled at the end of the current period' };
  }
}
