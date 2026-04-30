import { Controller, Get, Post, Body, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { AdminListProductsUseCase } from '../../application/use-cases/admin-list-products.use-case';
import { CreateB2CProductUseCase } from '../../application/use-cases/create-b2c-product.use-case';
import { CreateB2CProductDTO } from '../../application/dtos/create-b2c-product.dto';

@ApiTags('Admin B2C Products')
@Controller('b2c/products')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class AdminProductsController {
  constructor(
    private readonly adminListProductsUseCase: AdminListProductsUseCase,
    private readonly createB2CProductUseCase: CreateB2CProductUseCase,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  @Get()
  @ApiOperation({ summary: 'List all B2C products for the tenant (admin)' })
  @ApiResponse({ status: 200, description: 'Products listed' })
  async listProducts(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException(
        'Missing required header: x-tenant-id. Send the tenant ID in the x-tenant-id header.',
      );
    }
    return this.adminListProductsUseCase.execute(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a B2C recurring product (syncs with Stripe)' })
  @ApiResponse({ status: 201, description: 'Product created and synced with Stripe' })
  @ApiResponse({ status: 400, description: 'Stripe not configured or invalid data' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateB2CProductDTO,
  ) {
    if (!tenantId) {
      throw new BadRequestException(
        'Missing required header: x-tenant-id. Send the tenant ID in the x-tenant-id header.',
      );
    }
    return this.createB2CProductUseCase.execute(tenantId, dto);
  }
}
