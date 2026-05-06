import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { ManageB2BProductFeesUseCase } from '../../application/use-cases/manage-b2b-product-fees.use-case';
import { CalculateB2BOrderCostUseCase } from '../../application/use-cases/calculate-b2b-order-cost.use-case';
import { UpdateProductFeesDTO, OrderCostBreakdownResponseDTO, UpsertFeeConfigDTO } from '../../../zarp-b2c-products/application/dtos/fee-config.dto';
import {
  IB2BFeeConfigRepository,
  B2B_FEE_CONFIG_REPOSITORY,
} from '../../domain/interfaces/b2b-fee-config.repository.interface';
import { Inject } from '@nestjs/common';

@ApiTags('B2B Fees')
@Controller('b2b/fees')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminB2BFeesController {
  constructor(
    private readonly manageB2BProductFeesUseCase: ManageB2BProductFeesUseCase,
    private readonly calculateB2BOrderCostUseCase: CalculateB2BOrderCostUseCase,
    @Inject(B2B_FEE_CONFIG_REPOSITORY)
    private readonly b2bFeeConfigRepo: IB2BFeeConfigRepository,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  // ─── Taxa Global B2B ─────────────────────────────────────────────────────────

  @Get('global')
  @ApiOperation({
    summary: 'Buscar taxa global B2B (one-time)',
    description: 'Retorna chip cost % e shipping fee globais para produtos B2B. Isolado da taxa global B2C.',
  })
  @ApiResponse({ status: 200, description: 'Taxa global B2B (null se não configurada)' })
  async getGlobalConfig(@Headers('x-tenant-id') tenantId: string) {
    return this.b2bFeeConfigRepo.findByTenantId(this.getTenantId(tenantId));
  }

  @Put('global')
  @ApiOperation({
    summary: 'Criar ou atualizar taxa global B2B (one-time)',
    description: 'Define chip cost % e shipping fee globais para produtos B2B. Independente da taxa global B2C.',
  })
  @ApiResponse({ status: 200, description: 'Taxa global B2B salva' })
  async upsertGlobalConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpsertFeeConfigDTO,
  ) {
    return this.b2bFeeConfigRepo.upsert(this.getTenantId(tenantId), {
      chipCostPercent: dto.chipCostPercent,
      shippingFee: dto.shippingFee,
    });
  }

  // ─── Filtro por Categoria ─────────────────────────────────────────────────────

  @Get('categories/:categoryId/products')
  @ApiOperation({
    summary: 'Listar produtos B2B de uma categoria',
    description: 'Filtro: retorna todos os produtos B2B associados a esta categoria.',
  })
  @ApiParam({ name: 'categoryId', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Produtos da categoria' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async getProductsByCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.manageB2BProductFeesUseCase.getProductsByCategory(
      this.getTenantId(tenantId),
      categoryId,
    );
  }

  // ─── Override por Produto ─────────────────────────────────────────────────────

  @Patch('products/:productId')
  @ApiOperation({
    summary: 'Configurar taxas de um produto B2B específico',
    description:
      'Define categoria, chip cost override e/ou shipping fee override para um produto B2B. ' +
      'Valores null removem o override (produto volta a herdar da categoria/global B2B).',
  })
  @ApiParam({ name: 'productId', description: 'ID do produto B2B' })
  @ApiResponse({ status: 200, description: 'Taxas do produto atualizadas' })
  @ApiResponse({ status: 404, description: 'Produto ou categoria não encontrada' })
  async updateProductFees(
    @Headers('x-tenant-id') tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductFeesDTO,
  ) {
    return this.manageB2BProductFeesUseCase.updateProductFees(
      productId,
      this.getTenantId(tenantId),
      dto,
    );
  }

  @Post('products/:productId/calculate-cost')
  @ApiOperation({
    summary: 'Calcular custo total de um produto B2B',
    description: 'Retorna breakdown usando b2b_fee_config como global (isolado do B2C).',
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
}
