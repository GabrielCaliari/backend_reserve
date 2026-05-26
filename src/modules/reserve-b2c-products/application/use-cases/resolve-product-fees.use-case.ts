import { Injectable, Inject } from '@nestjs/common';
import {
  IProductCategoryRepository,
  PRODUCT_CATEGORY_REPOSITORY,
} from '../../domain/interfaces/product-category.repository.interface';
import {
  IB2CFeeConfigRepository,
  B2C_FEE_CONFIG_REPOSITORY,
} from '../../domain/interfaces/b2c-fee-config.repository.interface';

export interface ProductFeeInput {
  categoryId: string | null;
  chipCostOverride: number | null;
  shippingFeeOverride: number | null;
  requiresShipping: boolean;
}

// Generic fee config — works for both B2C and B2B global configs
export interface IFeeConfig {
  chipCostPercent: number;
  shippingFee: number;
}

export interface ResolvedFees {
  chipCostPercent: number;
  shippingFee: number;
  chipCostSource: 'product' | 'category' | 'global' | 'none';
  shippingFeeSource: 'product' | 'category' | 'global' | 'none';
}

export interface OrderCostBreakdown {
  basePrice: number;
  chipCostAmount: number;
  shippingFee: number;
  total: number;
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
    private readonly b2cFeeConfigRepo: IB2CFeeConfigRepository,
  ) {}

  /**
   * Resolve taxas para produto B2C — usa b2c_fee_config como global.
   */
  async resolveForProduct(tenantId: string, product: ProductFeeInput): Promise<ResolvedFees> {
    const globalConfig = await this.b2cFeeConfigRepo.findByTenantId(tenantId);
    return this.resolve(tenantId, product, globalConfig);
  }

  /**
   * Resolve taxas com config global explícita — usar para B2B passando B2BFeeConfig.
   */
  async resolveForProductWithConfig(
    tenantId: string,
    product: ProductFeeInput,
    globalConfig: IFeeConfig | null,
  ): Promise<ResolvedFees> {
    return this.resolve(tenantId, product, globalConfig);
  }

  private async resolve(
    tenantId: string,
    product: ProductFeeInput,
    globalConfig: IFeeConfig | null,
  ): Promise<ResolvedFees> {
    const category = product.categoryId
      ? await this.categoryRepo.findById(product.categoryId, tenantId)
      : null;

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
   * Calcula o breakdown completo de custo.
   * globalConfig opcional — se não passado, usa b2c_fee_config (comportamento B2C padrão).
   */
  async calculateBreakdown(
    tenantId: string,
    product: ProductFeeInput,
    basePrice: number,
    currency: string,
    includeShipping: boolean = true,
    globalConfig?: IFeeConfig | null,
  ): Promise<OrderCostBreakdown> {
    const fees = globalConfig !== undefined
      ? await this.resolveForProductWithConfig(tenantId, product, globalConfig)
      : await this.resolveForProduct(tenantId, product);

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
