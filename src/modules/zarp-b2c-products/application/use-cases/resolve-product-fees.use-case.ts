import { Injectable, Inject } from '@nestjs/common';
import {
  IProductCategoryRepository,
  PRODUCT_CATEGORY_REPOSITORY,
} from '../../domain/interfaces/product-category.repository.interface';
import {
  IB2CFeeConfigRepository,
  B2C_FEE_CONFIG_REPOSITORY,
} from '../../domain/interfaces/b2c-fee-config.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

export interface ResolvedFees {
  chipCostPercent: number;  // % aplicado sobre o preço base
  shippingFee: number;      // centavos fixos de frete
  chipCostSource: 'product' | 'category' | 'global' | 'none';
  shippingFeeSource: 'product' | 'category' | 'global' | 'none';
}

export interface OrderCostBreakdown {
  basePrice: number;        // unit_amount original em centavos
  chipCostAmount: number;   // valor do chip cost em centavos (basePrice * chipCostPercent / 100)
  shippingFee: number;      // frete em centavos (fixo por pedido)
  total: number;            // basePrice + chipCostAmount + shippingFee
  currency: string;
  chipCostPercent: number;
  chipCostSource: ResolvedFees['chipCostSource'];
  shippingFeeSource: ResolvedFees['shippingFeeSource'];
  requiresShipping: boolean;
}

@Injectable()
export class ResolveProductFeesUseCase {
  constructor(
    @Inject(PRODUCT_CATEGORY_REPOSITORY)
    private readonly categoryRepo: IProductCategoryRepository,
    @Inject(B2C_FEE_CONFIG_REPOSITORY)
    private readonly feeConfigRepo: IB2CFeeConfigRepository,
  ) {}

  /**
   * Resolve as taxas efetivas de um produto seguindo a hierarquia:
   * 1. Override do produto (chip_cost_override / shipping_fee_override)
   * 2. Taxa da categoria (chip_cost_percent / shipping_fee)
   * 3. Taxa global do tenant (B2CFeeConfig)
   * 4. Zero (sem taxa configurada)
   */
  async resolveForProduct(tenantId: string, product: ProductEntity): Promise<ResolvedFees> {
    // Carrega categoria e config global em paralelo
    const [category, globalConfig] = await Promise.all([
      product.categoryId
        ? this.categoryRepo.findById(product.categoryId, tenantId)
        : Promise.resolve(null),
      this.feeConfigRepo.findByTenantId(tenantId),
    ]);

    // ── Chip Cost ──────────────────────────────────────────────
    let chipCostPercent: number;
    let chipCostSource: ResolvedFees['chipCostSource'];

    if (product.chipCostOverride !== null && product.chipCostOverride !== undefined) {
      chipCostPercent = product.chipCostOverride;
      chipCostSource = 'product';
    } else if (category?.chipCostPercent !== null && category?.chipCostPercent !== undefined) {
      chipCostPercent = category.chipCostPercent;
      chipCostSource = 'category';
    } else if (globalConfig) {
      chipCostPercent = globalConfig.chipCostPercent;
      chipCostSource = 'global';
    } else {
      chipCostPercent = 0;
      chipCostSource = 'none';
    }

    // ── Shipping Fee ───────────────────────────────────────────
    let shippingFee: number;
    let shippingFeeSource: ResolvedFees['shippingFeeSource'];

    if (product.shippingFeeOverride !== null && product.shippingFeeOverride !== undefined) {
      shippingFee = product.shippingFeeOverride;
      shippingFeeSource = 'product';
    } else if (category?.shippingFee !== null && category?.shippingFee !== undefined) {
      shippingFee = category.shippingFee;
      shippingFeeSource = 'category';
    } else if (globalConfig) {
      shippingFee = globalConfig.shippingFee;
      shippingFeeSource = 'global';
    } else {
      shippingFee = 0;
      shippingFeeSource = 'none';
    }

    return { chipCostPercent, chipCostSource, shippingFee, shippingFeeSource };
  }

  /**
   * Calcula o breakdown completo de custo para um produto + preço base.
   * O shippingFee é cobrado uma vez por pedido (fixo independente da quantidade).
   */
  async calculateBreakdown(
    tenantId: string,
    product: ProductEntity,
    basePrice: number,
    currency: string,
    includeShipping: boolean = true,
  ): Promise<OrderCostBreakdown> {
    const fees = await this.resolveForProduct(tenantId, product);

    const chipCostAmount = Math.round(basePrice * (fees.chipCostPercent / 100));
    const shippingFee = includeShipping && product.requiresShipping ? fees.shippingFee : 0;
    const total = basePrice + chipCostAmount + shippingFee;

    return {
      basePrice,
      chipCostAmount,
      shippingFee,
      total,
      currency,
      chipCostPercent: fees.chipCostPercent,
      chipCostSource: fees.chipCostSource,
      shippingFeeSource: fees.shippingFeeSource,
      requiresShipping: product.requiresShipping,
    };
  }
}
