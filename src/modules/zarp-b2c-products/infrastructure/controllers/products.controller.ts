import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case';
import { CalculateOrderCostUseCase } from '../../application/use-cases/calculate-order-cost.use-case';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { UserTenantGuard } from '../../../../shared/auth/guards/user-tenant.guard';
import { CurrentUser } from '../../../../shared/auth/decorators/current-user.decorator';
import { ProductAccessGuard } from '../../../zarp-b2c-subscriptions/infrastructure/guards/product-access.guard';
import { OrderCostBreakdownResponseDTO } from '../../application/dtos/fee-config.dto';

export class CalculateCostBodyDTO {
  priceId?: string;
}

@ApiTags('B2C Products')
@Controller('products')
@UseGuards(UserJwtGuard, UserTenantGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class ProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly calculateOrderCostUseCase: CalculateOrderCostUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos ativos com preços' })
  @ApiResponse({ status: 200, description: 'Produtos listados' })
  async listProducts(@CurrentUser('tenant_id') tenantId: string) {
    return this.listProductsUseCase.execute(tenantId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Buscar produto por slug' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProduct(
    @CurrentUser('tenant_id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.getProductUseCase.execute(tenantId, slug);
  }

  @Post(':id/calculate-cost')
  @ApiOperation({
    summary: 'Calcular custo total do pedido',
    description:
      'Retorna breakdown: preço base + chip cost (%) + frete fixo. ' +
      'Informa a origem de cada taxa (produto/categoria/global). ' +
      'Frete só é incluído para produtos físicos (requires_shipping = true).',
  })
  @ApiParam({ name: 'id', description: 'ID do produto' })
  @ApiResponse({ status: 200, type: OrderCostBreakdownResponseDTO })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async calculateCost(
    @CurrentUser('tenant_id') tenantId: string,
    @Param('id') productId: string,
    @Body() body: CalculateCostBodyDTO,
  ): Promise<OrderCostBreakdownResponseDTO> {
    return this.calculateOrderCostUseCase.execute({
      tenantId,
      productId,
      priceId: body.priceId,
    });
  }

  @Get(':slug/content')
  @UseGuards(ProductAccessGuard)
  @ApiOperation({ summary: 'Acessar conteúdo do produto (requer acesso ativo)' })
  @ApiResponse({ status: 200, description: 'Conteúdo acessível' })
  @ApiResponse({ status: 403, description: 'Sem acesso ativo para este produto' })
  async getProductContent(
    @CurrentUser('tenant_id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return { content: 'ok', slug };
  }
}
