import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import {
  IB2BFeeConfigRepository,
  B2B_FEE_CONFIG_REPOSITORY,
} from '../../domain/interfaces/b2b-fee-config.repository.interface';
import {
  ResolveProductFeesUseCase,
  OrderCostBreakdown,
} from '../../../reserve-b2c-products/application/use-cases/resolve-product-fees.use-case';

@Injectable()
export class CalculateB2BOrderCostUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(B2B_FEE_CONFIG_REPOSITORY)
    private readonly b2bFeeConfigRepo: IB2BFeeConfigRepository,
    private readonly resolveFeesUseCase: ResolveProductFeesUseCase,
  ) {}

  async execute(tenantId: string, productId: string): Promise<OrderCostBreakdown> {
    const [product, b2bGlobalConfig] = await Promise.all([
      this.productRepo.findById(productId, tenantId),
      this.b2bFeeConfigRepo.findByTenantId(tenantId),
    ]);

    if (!product) throw new NotFoundException('Produto não encontrado');

    // Usa b2b_fee_config como global — isolado do b2c_fee_config
    return this.resolveFeesUseCase.calculateBreakdown(
      tenantId,
      {
        categoryId: product.categoryId,
        chipCostOverride: product.chipCostOverride,
        shippingFeeOverride: product.shippingFeeOverride,
        requiresShipping: product.requiresShipping,
      },
      product.price,
      product.currency,
      true,
      b2bGlobalConfig, // passa explicitamente a config B2B
    );
  }
}
