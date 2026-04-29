import { Controller, Get, Param, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { UserTenantGuard } from '../../../../shared/auth/guards/user-tenant.guard';
import { CurrentUser } from '../../../../shared/auth/decorators/current-user.decorator';
import { SubscriptionAccessGuard } from '../../../zarp-b2c-subscriptions/infrastructure/guards/subscription-access.guard';

@ApiTags('B2C Products')
@Controller('products')
@UseGuards(UserJwtGuard, UserTenantGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class ProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active products with prices' })
  @ApiResponse({ status: 200, description: 'Products listed successfully' })
  async listProducts(@CurrentUser('tenant_id') tenantId: string) {
    return this.listProductsUseCase.execute(tenantId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product details by slug' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @CurrentUser('tenant_id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.getProductUseCase.execute(tenantId, slug);
  }

  @Get(':slug/content')
  @UseGuards(SubscriptionAccessGuard)
  @ApiOperation({ summary: 'Access product content (requires active subscription)' })
  @ApiResponse({ status: 200, description: 'Content accessible' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No active subscription for this product' })
  async getProductContent(
    @CurrentUser('tenant_id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return { content: 'ok', slug };
  }
}
