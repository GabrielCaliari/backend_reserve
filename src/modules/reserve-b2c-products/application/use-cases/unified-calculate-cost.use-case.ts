import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/interfaces/product.repository.interface';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../../reserve-b2b-payments/domain/interfaces/b2b-product.repository.interface';
import {
  IB2BFeeConfigRepository,
  B2B_FEE_CONFIG_REPOSITORY,
} from '../../../reserve-b2b-payments/domain/interfaces/b2b-fee-config.repository.interface';
import { ResolveProductFeesUseCase } from './resolve-product-fees.use-case';
import {
  UnifiedCalculateCostDTO,
  UnifiedCartCostResponseDTO,
  UnifiedCartItemCostDTO,
} from '../dtos/unified-checkout.dto';

@Injectable()
export class UnifiedCalculateCostUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly b2cProductRepo: IProductRepository,
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly b2bProductRepo: IB2BProductRepository,
    @Inject(B2B_FEE_CONFIG_REPOSITORY)
    private readonly b2bFeeConfigRepo: IB2BFeeConfigRepository,
    private readonly resolveFeesUseCase: ResolveProductFeesUseCase,
  ) {}

  async execute(tenantId: string, dto: UnifiedCalculateCostDTO): Promise<UnifiedCartCostResponseDTO> {
    const itemCosts: UnifiedCartItemCostDTO[] = [];
    let maxShippingFee = 0;
    let currency = 'brl';

    // Load B2B global config once
    const b2bGlobalConfig = await this.b2bFeeConfigRepo.findByTenantId(tenantId);

    for (const item of dto.items) {
      if (item.type === 'b2b') {
        const product = await this.b2bProductRepo.findById(item.productId, tenantId);
        if (!product || !product.isActive()) {
          throw new NotFoundException(`Produto B2B não encontrado: ${item.productId}`);
        }

        const breakdown = await this.resolveFeesUseCase.calculateBreakdown(
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
          b2bGlobalConfig,
        );

        currency = product.currency;
        if (breakdown.shippingFee > maxShippingFee) maxShippingFee = breakdown.shippingFee;

        itemCosts.push({
          productId: product.id,
          name: product.name,
          type: 'b2b',
          quantity: item.quantity,
          basePrice: breakdown.basePrice,
          chipCostAmount: breakdown.chipCostAmount,
          chipCostPercent: breakdown.chipCostPercent,
          subtotal: (breakdown.basePrice + breakdown.chipCostAmount) * item.quantity,
          currency: product.currency,
          requiresShipping: product.requiresShipping,
        });
      } else {
        // B2C
        const product = await this.b2cProductRepo.findById(item.productId, tenantId);
        if (!product || !product.active) {
          throw new NotFoundException(`Produto B2C não encontrado: ${item.productId}`);
        }

        const price = item.priceId
          ? product.prices.find((p) => p.id === item.priceId && p.active)
          : product.prices.find((p) => p.active);

        if (!price) {
          throw new BadRequestException(
            `Preço não encontrado para o produto B2C: ${item.productId}`,
          );
        }

        // B2C usa b2c_fee_config (sem passar globalConfig = usa padrão B2C)
        const breakdown = await this.resolveFeesUseCase.calculateBreakdown(
          tenantId,
          {
            categoryId: product.categoryId,
            chipCostOverride: product.chipCostOverride,
            shippingFeeOverride: product.shippingFeeOverride,
            requiresShipping: product.requiresShipping,
          },
          price.unitAmount,
          price.currency,
          true,
        );

        currency = price.currency;
        if (breakdown.shippingFee > maxShippingFee) maxShippingFee = breakdown.shippingFee;

        itemCosts.push({
          productId: product.id,
          name: product.name,
          type: 'b2c',
          quantity: item.quantity,
          basePrice: breakdown.basePrice,
          chipCostAmount: breakdown.chipCostAmount,
          chipCostPercent: breakdown.chipCostPercent,
          subtotal: (breakdown.basePrice + breakdown.chipCostAmount) * item.quantity,
          currency: price.currency,
          requiresShipping: product.requiresShipping,
        });
      }
    }

    const totalBasePrice = itemCosts.reduce((s, i) => s + i.basePrice * i.quantity, 0);
    const totalChipCost = itemCosts.reduce((s, i) => s + i.chipCostAmount * i.quantity, 0);
    const total = totalBasePrice + totalChipCost + maxShippingFee;

    return {
      items: itemCosts,
      totalBasePrice,
      totalChipCost,
      shippingFee: maxShippingFee,
      total,
      currency,
    };
  }
}
