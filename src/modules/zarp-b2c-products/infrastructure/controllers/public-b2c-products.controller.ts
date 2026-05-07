import { Controller, Get, Post, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case';
import { CalculateOrderCostUseCase } from '../../application/use-cases/calculate-order-cost.use-case';
import { OrderCostBreakdownResponseDTO } from '../../application/dtos/fee-config.dto';

/**
 * Controller público para produtos B2C (cursos, bundles).
 * Não requer autenticação — permite que visitantes vejam os produtos
 * e calculem preços antes de criar conta ou fazer login.
 *
 * Para checkout, usar POST /api/subscriptions/checkout (suporta leads sem conta).
 */
@ApiTags('Public B2C Products')
@Controller('public/b2c/products')
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class PublicB2CProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly calculateOrderCostUseCase: CalculateOrderCostUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Get()
  @ApiOperation({
    summary: 'Listar produtos B2C ativos (público)',
    description:
      'Lista todos os cursos e bundles ativos com seus preços. ' +
      'Não requer autenticação — usar para exibir cards de produtos para visitantes.',
  })
  @ApiResponse({ status: 200, description: 'Produtos listados' })
  async listProducts(@Headers('x-tenant-id') tenantId: string) {
    return this.listProductsUseCase.execute(this.getTenantId(tenantId));
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Buscar produto B2C por slug (público)',
    description: 'Retorna detalhes de um produto com todos os preços disponíveis.',
  })
  @ApiParam({ name: 'slug', description: 'Slug do produto (ex: react-avancado)' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.getProductUseCase.execute(this.getTenantId(tenantId), slug);
  }

  @Post(':id/calculate-cost')
  @ApiOperation({
    summary: 'Calcular custo total de um produto B2C (público)',
    description:
      'Retorna breakdown: preço base + chip cost (%) + frete. ' +
      'Usar para exibir o preço final antes do checkout. Não requer autenticação.',
  })
  @ApiParam({ name: 'id', description: 'ID do produto B2C' })
  @ApiResponse({ status: 200, type: OrderCostBreakdownResponseDTO })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async calculateCost(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') productId: string,
    @Body() body: { priceId?: string },
  ): Promise<OrderCostBreakdownResponseDTO> {
    return this.calculateOrderCostUseCase.execute({
      tenantId: this.getTenantId(tenantId),
      productId,
      priceId: body?.priceId,
    });
  }
}
