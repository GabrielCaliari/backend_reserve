import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/interfaces/product.repository.interface';
import { ResolveProductFeesUseCase, OrderCostBreakdown } from './resolve-product-fees.use-case';

export interface CalculateOrderCostInput {
  tenantId: string;
  productId: string;
  priceId?: string; // se não informado, usa o primeiro preço ativo
}

@Injectable()
export class CalculateOrderCostUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
    private readonly resolveFeesUseCase: ResolveProductFeesUseCase,
  ) {}

  async execute(input: CalculateOrderCostInput): Promise<OrderCostBreakdown> {
    const product = await this.productRepo.findById(input.productId, input.tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Resolve o preço base
    const price = input.priceId
      ? product.prices.find((p) => p.id === input.priceId && p.active)
      : product.prices.find((p) => p.active);

    if (!price) throw new NotFoundException('Preço ativo não encontrado para este produto');

    return this.resolveFeesUseCase.calculateBreakdown(
      input.tenantId,
      product,
      price.unitAmount,
      price.currency,
      true,
    );
  }
}
