import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam } from '@nestjs/swagger';
import { ListB2BProductsUseCase } from '../../application/use-cases/list-b2b-products.use-case';
import { CreateLeadCheckoutUseCase } from '../../application/use-cases/create-lead-checkout.use-case';
import { CreateCartCheckoutUseCase } from '../../application/use-cases/create-cart-checkout.use-case';
import { CalculateB2BOrderCostUseCase } from '../../application/use-cases/calculate-b2b-order-cost.use-case';
import { CreateLeadCheckoutDTO } from '../../application/dtos/create-lead-checkout.dto';
import { CreateCartCheckoutDTO } from '../../application/dtos/create-cart-checkout.dto';
import { OptionalUserGuard } from '../guards/optional-user.guard';
import { OrderCostBreakdownResponseDTO } from '../../../zarp-b2c-products/application/dtos/fee-config.dto';

/**
 * Controller público para produtos B2B avulsos.
 * 
 * Permite que leads (não autenticados) E users (autenticados) possam:
 * - Listar produtos disponíveis
 * - Criar checkout sem obrigatoriedade de login
 * 
 * Fluxo Lead (sem login):
 * 1. Lead acessa /api/public/b2b/products
 * 2. Clica em "Comprar"
 * 3. Modal captura nome, email e telefone
 * 4. POST /api/public/b2b/products/:id/checkout
 * 5. Redireciona para Stripe
 * 6. Webhook converte lead em user após pagamento
 * 
 * Fluxo User (com login):
 * 1. User logado acessa /api/public/b2b/products
 * 2. Clica em "Comprar"
 * 3. POST /api/public/b2b/products/:id/checkout (com token)
 * 4. Redireciona para Stripe
 * 5. Webhook vincula compra ao user existente
 */
@ApiTags('Public B2B Products')
@Controller('public/b2b/products')
@UseGuards(OptionalUserGuard)
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class PublicB2BProductsController {
  constructor(
    private readonly listB2BProductsUseCase: ListB2BProductsUseCase,
    private readonly createLeadCheckoutUseCase: CreateLeadCheckoutUseCase,
    private readonly createCartCheckoutUseCase: CreateCartCheckoutUseCase,
    private readonly calculateB2BOrderCostUseCase: CalculateB2BOrderCostUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return tenantId;
  }

  // ─── GET /public/b2b/products ──────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all active B2B products (public)',
    description: 'Endpoint público para listar produtos B2B. Não requer autenticação.',
  })
  @ApiResponse({ status: 200, description: 'Products listed successfully' })
  async listProducts(@Headers('x-tenant-id') tenantId: string) {
    const products = await this.listB2BProductsUseCase.execute(this.getTenantId(tenantId));
    return products.filter(p => p.isActive());
  }

  // ─── POST /public/b2b/products/:productId/calculate-cost ──────────────────

  @Post(':productId/calculate-cost')
  @ApiOperation({
    summary: 'Calcular custo total de um produto B2B (público)',
    description:
      'Retorna breakdown de preço base + chip cost + frete. ' +
      'Usar para exibir o preço final antes do checkout. Não requer autenticação.',
  })
  @ApiParam({ name: 'productId', description: 'ID do produto B2B' })
  @ApiResponse({ status: 200, type: OrderCostBreakdownResponseDTO })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async calculateCost(
    @Headers('x-tenant-id') tenantId: string,
    @Param('productId') productId: string,
  ): Promise<OrderCostBreakdownResponseDTO> {
    return this.calculateB2BOrderCostUseCase.execute(this.getTenantId(tenantId), productId);
  }

  // ─── POST /public/b2b/products/:productId/checkout ─────────────────────────
  // DEVE vir antes de qualquer rota estática para não conflitar

  @Post(':productId/checkout')
  @ApiOperation({
    summary: 'Create checkout for a single product (public)',
    description: 'Cria checkout do Stripe para um produto B2B avulso. Não requer autenticação.',
  })
  @ApiResponse({ status: 201, description: 'Checkout created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or Stripe not configured' })
  @ApiResponse({ status: 404, description: 'Product not found or inactive' })
  async createLeadCheckout(
    @Headers('x-tenant-id') tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateLeadCheckoutDTO,
    @Req() req: any,
  ) {
    if (dto.productId !== productId) {
      throw new BadRequestException('Product ID mismatch');
    }

    const userId = req.user_id || undefined;

    return this.createLeadCheckoutUseCase.execute(
      this.getTenantId(tenantId),
      dto,
      userId,
    );
  }
}

/**
 * Controller separado para o cart checkout.
 *
 * Usa o prefixo /public/b2b/checkout (sem /products) para evitar
 * conflito com a rota dinâmica POST /public/b2b/products/:productId/checkout.
 *
 * Endpoint: POST /api/public/b2b/checkout
 */
@ApiTags('Public B2B Products')
@Controller('public/b2b/checkout')
@UseGuards(OptionalUserGuard)
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class PublicB2BCartController {
  constructor(
    private readonly createCartCheckoutUseCase: CreateCartCheckoutUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return tenantId;
  }

  // ─── POST /public/b2b/checkout ─────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create cart checkout with multiple products (public)',
    description: `
      Cria uma única Stripe Checkout Session com múltiplos produtos.
      Suporta leads (sem login) e users autenticados.
      Um B2BPurchase é criado por item para rastreamento granular.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Cart checkout created successfully',
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_xxxxx',
        purchaseIds: ['cm5abc123', 'cm5xyz789'],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid data or Stripe not configured' })
  @ApiResponse({ status: 404, description: 'One or more products not found or inactive' })
  async createCartCheckout(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCartCheckoutDTO,
    @Req() req: any,
  ) {
    const userId = req.user_id || undefined;

    return this.createCartCheckoutUseCase.execute(
      this.getTenantId(tenantId),
      dto,
      userId,
    );
  }
}
