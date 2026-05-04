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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ListB2BProductsUseCase } from '../../application/use-cases/list-b2b-products.use-case';
import { CreateLeadCheckoutUseCase } from '../../application/use-cases/create-lead-checkout.use-case';
import { CreateCartCheckoutUseCase } from '../../application/use-cases/create-cart-checkout.use-case';
import { CreateLeadCheckoutDTO } from '../../application/dtos/create-lead-checkout.dto';
import { CreateCartCheckoutDTO } from '../../application/dtos/create-cart-checkout.dto';
import { OptionalUserGuard } from '../guards/optional-user.guard';

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
@UseGuards(OptionalUserGuard) // Permite acesso com ou sem autenticação
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class PublicB2BProductsController {
  constructor(
    private readonly listB2BProductsUseCase: ListB2BProductsUseCase,
    private readonly createLeadCheckoutUseCase: CreateLeadCheckoutUseCase,
    private readonly createCartCheckoutUseCase: CreateCartCheckoutUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return tenantId;
  }

  // ─── Public Endpoints ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ 
    summary: 'List all active B2B products (public)',
    description: 'Endpoint público para listar produtos B2B. Não requer autenticação.'
  })
  @ApiResponse({ status: 200, description: 'Products listed successfully' })
  async listProducts(@Headers('x-tenant-id') tenantId: string) {
    const products = await this.listB2BProductsUseCase.execute(this.getTenantId(tenantId));
    
    // Retorna apenas produtos ativos
    return products.filter(p => p.isActive());
  }

  @Post(':productId/checkout')
  @ApiOperation({ 
    summary: 'Create checkout for lead or authenticated user (public)',
    description: `
      Cria checkout do Stripe para produto B2B avulso.
      
      Suporta 2 cenários:
      1. Lead não autenticado: Captura dados básicos (nome, email, telefone)
      2. User autenticado: Vincula compra ao user existente
      
      Não é necessário estar logado, mas se estiver, a compra será vinculada à conta.
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Checkout created successfully',
    schema: {
      example: {
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_xxxxx',
        purchaseId: 'cm5abc123'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid data or Stripe not configured' })
  @ApiResponse({ status: 404, description: 'Product not found or inactive' })
  async createLeadCheckout(
    @Headers('x-tenant-id') tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateLeadCheckoutDTO,
    @Req() req: any, // Para acessar req.user_id do OptionalUserGuard
  ) {
    // Valida que o productId do param bate com o do body
    if (dto.productId !== productId) {
      throw new BadRequestException('Product ID mismatch');
    }

    // Passa userId se existir (user autenticado)
    const userId = req.user_id || undefined;

    return this.createLeadCheckoutUseCase.execute(
      this.getTenantId(tenantId), 
      dto,
      userId, // Opcional: undefined para leads, string para users
    );
  }

  // ─── Cart Checkout ─────────────────────────────────────────────────────────

  @Post('checkout')
  @ApiOperation({
    summary: 'Create cart checkout with multiple products (public)',
    description: `
      Cria uma única Stripe Checkout Session com múltiplos produtos.

      Suporta 2 cenários:
      1. Lead não autenticado: Captura dados via modal antes do checkout
      2. User autenticado: Vincula compras ao user existente

      Um B2BPurchase é criado por item para rastreamento granular.
      Se o lead abandonar, os dados ficam salvos para remarketing.
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
