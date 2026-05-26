import { Controller, Post, Body, Headers, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { UnifiedCheckoutUseCase } from '../../application/use-cases/unified-checkout.use-case';
import { UnifiedCalculateCostUseCase } from '../../application/use-cases/unified-calculate-cost.use-case';
import { UnifiedCheckoutDTO, UnifiedCalculateCostDTO, UnifiedCartCostResponseDTO } from '../../application/dtos/unified-checkout.dto';
import { OptionalUserGuard } from '../../../reserve-b2b-payments/infrastructure/guards/optional-user.guard';

@ApiTags('Public Unified Checkout')
@Controller('public/checkout')
@UseGuards(OptionalUserGuard)
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class PublicUnifiedCheckoutController {
  constructor(
    private readonly unifiedCheckoutUseCase: UnifiedCheckoutUseCase,
    private readonly unifiedCalculateCostUseCase: UnifiedCalculateCostUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Post('calculate-cost')
  @ApiOperation({
    summary: 'Calcular custo de carrinho misto B2B + B2C (público)',
    description:
      'Calcula o custo total de um carrinho com produtos B2B e/ou B2C. ' +
      'Retorna breakdown por item + totais consolidados. Não requer autenticação.',
  })
  @ApiResponse({ status: 200, type: UnifiedCartCostResponseDTO })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async calculateCost(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UnifiedCalculateCostDTO,
  ): Promise<UnifiedCartCostResponseDTO> {
    return this.unifiedCalculateCostUseCase.execute(this.getTenantId(tenantId), dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Checkout unificado B2B + B2C (público)',
    description:
      'Cria uma única Stripe Checkout Session com produtos B2B e/ou B2C misturados. ' +
      'Suporta leads (sem login) e usuários autenticados. ' +
      'Nota: carrinho misto usa mode=payment (one-time). ' +
      'Para produtos B2C recorrentes isolados, use POST /api/subscriptions/checkout.',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_xxx',
        purchaseIds: ['purchase_abc'],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou Stripe não configurado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async checkout(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UnifiedCheckoutDTO,
    @Req() req: any,
  ) {
    const userId: string | undefined = req.user_id ?? undefined;
    return this.unifiedCheckoutUseCase.execute(this.getTenantId(tenantId), dto, userId);
  }
}
