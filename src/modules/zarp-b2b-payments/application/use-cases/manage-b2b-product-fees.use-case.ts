import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import {
  IProductCategoryRepository,
  PRODUCT_CATEGORY_REPOSITORY,
} from '../../../zarp-b2c-products/domain/interfaces/product-category.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';
import { UpdateProductFeesDTO } from '../../../zarp-b2c-products/application/dtos/fee-config.dto';

@Injectable()
export class ManageB2BProductFeesUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
    @Inject(PRODUCT_CATEGORY_REPOSITORY)
    private readonly categoryRepo: IProductCategoryRepository,
  ) {}

  async getProductsByCategory(tenantId: string, categoryId: string): Promise<B2BProductEntity[]> {
    const category = await this.categoryRepo.findById(categoryId, tenantId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return this.productRepo.findByCategoryId(tenantId, categoryId);
  }

  async updateProductFees(
    productId: string,
    tenantId: string,
    dto: UpdateProductFeesDTO,
  ): Promise<B2BProductEntity> {
    const product = await this.productRepo.findById(productId, tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');

    if (dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId, tenantId);
      if (!category) throw new NotFoundException('Categoria não encontrada');
    }

    return this.productRepo.updateFees(productId, tenantId, {
      categoryId: dto.categoryId,
      chipCostOverride: dto.chipCostOverride,
      shippingFeeOverride: dto.shippingFeeOverride,
      requiresShipping: dto.requiresShipping,
    });
  }
}
