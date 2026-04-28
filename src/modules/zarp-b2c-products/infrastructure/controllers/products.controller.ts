import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { SubscriptionAccessGuard } from '../../../zarp-b2c-subscriptions/infrastructure/guards/subscription-access.guard';

@ApiTags('B2C Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active products with prices' })
  @ApiResponse({ status: 200, description: 'Products listed successfully' })
  async listProducts() {
    return this.listProductsUseCase.execute();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product details by slug' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('slug') slug: string) {
    return this.getProductUseCase.execute(slug);
  }

  @Get(':slug/content')
  @UseGuards(UserJwtGuard, SubscriptionAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Access product content (requires active subscription)' })
  @ApiResponse({ status: 200, description: 'Content accessible' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No active subscription for this product' })
  async getProductContent(@Param('slug') slug: string) {
    // Content delivery is handled by the application layer
    // The guard ensures only subscribed students reach here
    return { content: 'ok', slug };
  }
}
