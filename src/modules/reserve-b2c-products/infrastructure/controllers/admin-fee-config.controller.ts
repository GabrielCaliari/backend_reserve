import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ManageFeeConfigUseCase } from '../../application/use-cases/manage-fee-config.use-case';
import {
  UpsertFeeConfigDTO,
  CreateProductCategoryDTO,
  UpdateProductCategoryDTO,
  UpdateProductFeesDTO,
} from '../../application/dtos/fee-config.dto';

@ApiTags('Admin B2C Fee Config')
@Controller('b2c/fees')
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminFeeConfigController {
  constructor(private readonly manageFeeConfigUseCase: ManageFeeConfigUseCase) {}

  // ─── Taxa Global ─────────────────────────────────────────────────────────────

  @Get('global')
  @RequirePermissions('b2c-fees.read')
  @ApiOperation({
    summary: 'Buscar taxa global do tenant',
    description:
      'Retorna chip cost % e shipping fee globais. Aplicados a todos os produtos sem categoria ou override.',
  })
  @ApiResponse({ status: 200, description: 'Taxa global encontrada (null se não configurada)' })
  async getGlobalConfig(@Req() req: any) {
    return this.manageFeeConfigUseCase.getGlobalFeeConfig(req.tenant_id);
  }

  @Put('global')
  @RequirePermissions('b2c-fees.manage')
  @ApiOperation({
    summary: 'Criar ou atualizar taxa global do tenant',
    description:
      'Define chip cost % e shipping fee globais. Cria se não existir, atualiza se já existir.',
  })
  @ApiResponse({ status: 200, description: 'Taxa global salva com sucesso' })
  async upsertGlobalConfig(@Req() req: any, @Body() dto: UpsertFeeConfigDTO) {
    return this.manageFeeConfigUseCase.upsertGlobalFeeConfig(req.tenant_id, dto);
  }

  // ─── Categorias ──────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermissions('b2c-fees.read')
  @ApiOperation({
    summary: 'Listar categorias de produto com suas taxas',
    description: 'Retorna todas as categorias do tenant com chip cost % e shipping fee configurados.',
  })
  @ApiResponse({ status: 200, description: 'Categorias listadas' })
  async listCategories(@Req() req: any) {
    return this.manageFeeConfigUseCase.listCategories(req.tenant_id);
  }

  @Post('categories')
  @RequirePermissions('b2c-fees.manage')
  @ApiOperation({
    summary: 'Criar categoria de produto',
    description:
      'Cria uma categoria com taxas específicas. Ex: "Books" com chip cost 2% e frete R$15,00.',
  })
  @ApiResponse({ status: 201, description: 'Categoria criada' })
  @ApiResponse({ status: 409, description: 'Slug já existe' })
  async createCategory(@Req() req: any, @Body() dto: CreateProductCategoryDTO) {
    return this.manageFeeConfigUseCase.createCategory(req.tenant_id, dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('b2c-fees.manage')
  @ApiOperation({ summary: 'Atualizar categoria de produto' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async updateCategory(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDTO,
  ) {
    return this.manageFeeConfigUseCase.updateCategory(id, req.tenant_id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('b2c-fees.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover categoria de produto' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 204, description: 'Categoria removida' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    await this.manageFeeConfigUseCase.deleteCategory(id, req.tenant_id);
  }

  @Get('categories/:id/products')
  @RequirePermissions('b2c-fees.read')
  @ApiOperation({
    summary: 'Listar produtos de uma categoria',
    description: 'Filtro: retorna todos os produtos associados a esta categoria.',
  })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({ status: 200, description: 'Produtos da categoria' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async getProductsByCategory(@Req() req: any, @Param('id') id: string) {
    return this.manageFeeConfigUseCase.getProductsByCategory(req.tenant_id, id);
  }

  // ─── Override por Produto ─────────────────────────────────────────────────────

  @Patch('products/:productId')
  @RequirePermissions('b2c-fees.manage')
  @ApiOperation({
    summary: 'Configurar taxas de um produto específico',
    description:
      'Define categoria, chip cost override e/ou shipping fee override para um produto. ' +
      'Valores null removem o override (produto volta a herdar da categoria/global). ' +
      'Também define se o produto requer envio físico.',
  })
  @ApiParam({ name: 'productId', description: 'ID do produto B2C' })
  @ApiResponse({ status: 200, description: 'Taxas do produto atualizadas' })
  @ApiResponse({ status: 404, description: 'Produto ou categoria não encontrada' })
  async updateProductFees(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductFeesDTO,
  ) {
    return this.manageFeeConfigUseCase.updateProductFees(productId, req.tenant_id, dto);
  }
}
