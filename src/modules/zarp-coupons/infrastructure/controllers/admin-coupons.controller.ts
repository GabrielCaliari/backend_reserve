import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CreateCouponUseCase } from '../../application/use-cases/create-coupon.use-case';
import { UpdateCouponUseCase } from '../../application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from '../../application/use-cases/delete-coupon.use-case';
import { ListCouponsUseCase } from '../../application/use-cases/list-coupons.use-case';
import { GetCouponUseCase } from '../../application/use-cases/get-coupon.use-case';
import { CreateCouponDTO } from '../../application/dtos/create-coupon.dto';
import { UpdateCouponDTO } from '../../application/dtos/update-coupon.dto';

@ApiTags('Admin Coupons')
@Controller('admin/coupons')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminCouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly updateCouponUseCase: UpdateCouponUseCase,
    private readonly deleteCouponUseCase: DeleteCouponUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly getCouponUseCase: GetCouponUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Get()
  @ApiOperation({ summary: 'Listar cupons do tenant (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de cupons' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.listCouponsUseCase.execute(this.getTenantId(tenantId), page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cupom por ID' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  @ApiResponse({ status: 200, description: 'Cupom encontrado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.getCouponUseCase.execute(id, this.getTenantId(tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar cupom' })
  @ApiResponse({ status: 201, description: 'Cupom criado' })
  @ApiResponse({ status: 409, description: 'Código já existe' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCouponDTO,
  ) {
    return this.createCouponUseCase.execute(this.getTenantId(tenantId), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cupom' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  @ApiResponse({ status: 200, description: 'Cupom atualizado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDTO,
  ) {
    return this.updateCouponUseCase.execute(id, this.getTenantId(tenantId), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar cupom (soft-delete)' })
  @ApiParam({ name: 'id', description: 'ID do cupom' })
  @ApiResponse({ status: 200, description: 'Cupom desativado' })
  @ApiResponse({ status: 404, description: 'Cupom não encontrado' })
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.deleteCouponUseCase.execute(id, this.getTenantId(tenantId));
    return { message: 'Cupom desativado com sucesso' };
  }
}
