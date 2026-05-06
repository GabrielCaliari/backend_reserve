import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IB2CFeeConfigRepository,
  B2C_FEE_CONFIG_REPOSITORY,
} from '../../domain/interfaces/b2c-fee-config.repository.interface';
import {
  IProductCategoryRepository,
  PRODUCT_CATEGORY_REPOSITORY,
} from '../../domain/interfaces/product-category.repository.interface';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/interfaces/product.repository.interface';
import { B2CFeeConfigEntity } from '../../domain/entities/b2c-fee-config.entity';
import { ProductCategoryEntity } from '../../domain/entities/product-category.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import {
  UpsertFeeConfigDTO,
  CreateProductCategoryDTO,
  UpdateProductCategoryDTO,
  UpdateProductFeesDTO,
} from '../dtos/fee-config.dto';

@Injectable()
export class ManageFeeConfigUseCase {
  constructor(
    @Inject(B2C_FEE_CONFIG_REPOSITORY)
    private readonly feeConfigRepo: IB2CFeeConfigRepository,
    @Inject(PRODUCT_CATEGORY_REPOSITORY)
    private readonly categoryRepo: IProductCategoryRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  // ─── Taxa Global ────────────────────────────────────────────────────────────

  async getGlobalFeeConfig(tenantId: string): Promise<B2CFeeConfigEntity | null> {
    return this.feeConfigRepo.findByTenantId(tenantId);
  }

  async upsertGlobalFeeConfig(
    tenantId: string,
    dto: UpsertFeeConfigDTO,
  ): Promise<B2CFeeConfigEntity> {
    return this.feeConfigRepo.upsert(tenantId, {
      chipCostPercent: dto.chipCostPercent,
      shippingFee: dto.shippingFee,
    });
  }

  // ─── Categorias ─────────────────────────────────────────────────────────────

  async listCategories(tenantId: string): Promise<ProductCategoryEntity[]> {
    return this.categoryRepo.findAll(tenantId);
  }

  async createCategory(
    tenantId: string,
    dto: CreateProductCategoryDTO,
  ): Promise<ProductCategoryEntity> {
    return this.categoryRepo.create({
      tenantId,
      name: dto.name,
      slug: dto.slug,
      chipCostPercent: dto.chipCostPercent ?? null,
      shippingFee: dto.shippingFee ?? null,
    });
  }

  async updateCategory(
    id: string,
    tenantId: string,
    dto: UpdateProductCategoryDTO,
  ): Promise<ProductCategoryEntity> {
    const existing = await this.categoryRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Categoria não encontrada');
    return this.categoryRepo.update(id, tenantId, dto);
  }

  async deleteCategory(id: string, tenantId: string): Promise<void> {
    const existing = await this.categoryRepo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Categoria não encontrada');
    await this.categoryRepo.delete(id, tenantId);
  }

  async getProductsByCategory(tenantId: string, categoryId: string): Promise<ProductEntity[]> {
    const category = await this.categoryRepo.findById(categoryId, tenantId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return this.productRepo.findByCategoryId(tenantId, categoryId);
  }

  // ─── Override por Produto ────────────────────────────────────────────────────

  async updateProductFees(
    productId: string,
    tenantId: string,
    dto: UpdateProductFeesDTO,
  ): Promise<ProductEntity> {
    const product = await this.productRepo.findById(productId, tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Valida categoria se informada
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
