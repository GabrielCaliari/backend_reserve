import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CreateB2BProductUseCase } from '../../application/use-cases/create-b2b-product.use-case';
import { ListB2BProductsUseCase } from '../../application/use-cases/list-b2b-products.use-case';
import { CreatePaymentLinkUseCase } from '../../application/use-cases/create-payment-link.use-case';
import { ListPurchasesUseCase } from '../../application/use-cases/list-purchases.use-case';
import { GetMetricsUseCase } from '../../application/use-cases/get-metrics.use-case';
import { CreateB2BProductDTO } from '../../application/dtos/create-b2b-product.dto';
import { CreatePaymentLinkDTO } from '../../application/dtos/create-payment-link.dto';
import { ListPurchasesQueryDTO } from '../../application/dtos/list-purchases-query.dto';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';

@ApiTags('B2B Payments')
@Controller('b2b/payments')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
export class B2BPaymentsController {
  constructor(
    private readonly createB2BProductUseCase: CreateB2BProductUseCase,
    private readonly listB2BProductsUseCase: ListB2BProductsUseCase,
    private readonly createPaymentLinkUseCase: CreatePaymentLinkUseCase,
    private readonly listPurchasesUseCase: ListPurchasesUseCase,
    private readonly getMetricsUseCase: GetMetricsUseCase,
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
  ) {}

  private getTenantId(tenantId: string): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return tenantId;
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  @Post('products')
  @ApiOperation({ summary: 'Create a B2B product (syncs with Stripe automatically)' })
  @ApiResponse({ status: 201, description: 'Product created and synced with Stripe' })
  async createProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateB2BProductDTO,
  ) {
    return this.createB2BProductUseCase.execute(this.getTenantId(tenantId), dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all B2B products for the tenant' })
  @ApiResponse({ status: 200, description: 'Products listed' })
  async listProducts(@Headers('x-tenant-id') tenantId: string) {
    return this.listB2BProductsUseCase.execute(this.getTenantId(tenantId));
  }

  // ─── Payment Links ─────────────────────────────────────────────────────────

  @Post('create-link')
  @ApiOperation({ summary: 'Create a Stripe Checkout payment link for a customer' })
  @ApiResponse({ status: 201, description: 'Checkout URL created' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createPaymentLink(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePaymentLinkDTO,
  ) {
    return this.createPaymentLinkUseCase.execute(this.getTenantId(tenantId), dto);
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  @Get('purchases')
  @ApiOperation({ summary: 'List all purchases (checkout funnel)' })
  @ApiResponse({ status: 200, description: 'Purchases listed' })
  async listPurchases(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListPurchasesQueryDTO,
  ) {
    return this.listPurchasesUseCase.execute(this.getTenantId(tenantId), {
      status: query.status as EPurchaseStatus | 'all' | undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('purchases/:id')
  @ApiOperation({ summary: 'Get purchase details' })
  @ApiResponse({ status: 200, description: 'Purchase found' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async getPurchase(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const purchase = await this.purchaseRepo.findById(id, this.getTenantId(tenantId));
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  // ─── Metrics ───────────────────────────────────────────────────────────────

  @Get('metrics')
  @ApiOperation({ summary: 'Get B2B sales funnel metrics' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics(@Headers('x-tenant-id') tenantId: string) {
    return this.getMetricsUseCase.execute(this.getTenantId(tenantId));
  }
}
