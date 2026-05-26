import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { AdminListProductsUseCase } from '../../application/use-cases/admin-list-products.use-case';
import { CreateB2CProductUseCase } from '../../application/use-cases/create-b2c-product.use-case';
import { CalculateOrderCostUseCase } from '../../application/use-cases/calculate-order-cost.use-case';
import { CreateB2CProductDTO } from '../../application/dtos/create-b2c-product.dto';
import { OrderCostBreakdownResponseDTO } from '../../application/dtos/fee-config.dto';

@ApiTags('Admin B2C Products')
@Controller('b2c/products')
@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminProductsController {
  constructor(
    private readonly adminListProductsUseCase: AdminListProductsUseCase,
    private readonly createB2CProductUseCase: CreateB2CProductUseCase,
    private readonly calculateOrderCostUseCase: CalculateOrderCostUseCase,
  ) {}

  @Get()
  @Roles(EAdminRole.viewer)
  @ApiOperation({ summary: 'List all B2C products for the tenant (admin)' })
  @ApiResponse({ status: 200, description: 'Products listed' })
  async listProducts(@Req() req: any) {
    return this.adminListProductsUseCase.execute(req.tenant_id);
  }

  @Post()
  @Roles(EAdminRole.manager)
  @ApiOperation({ summary: 'Create a B2C recurring product (syncs with Stripe)' })
  @ApiResponse({ status: 201, description: 'Product created and synced with Stripe' })
  @ApiResponse({ status: 400, description: 'Stripe not configured or invalid data' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createProduct(@Req() req: any, @Body() dto: CreateB2CProductDTO) {
    return this.createB2CProductUseCase.execute(req.tenant_id, dto);
  }

  @Post(':id/calculate-cost')
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'Calcular custo total de um produto B2C (admin)',
    description: 'Retorna breakdown: preço base + chip cost (%) + frete. Usado no painel para exibir taxas aplicadas.',
  })
  @ApiParam({ name: 'id', description: 'ID do produto B2C' })
  @ApiResponse({ status: 200, type: OrderCostBreakdownResponseDTO })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async calculateCost(
    @Req() req: any,
    @Param('id') productId: string,
    @Body() body: { priceId?: string },
  ): Promise<OrderCostBreakdownResponseDTO> {
    return this.calculateOrderCostUseCase.execute({
      tenantId: req.tenant_id,
      productId,
      priceId: body?.priceId,
    });
  }
}
