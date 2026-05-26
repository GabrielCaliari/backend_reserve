import { ProductCategoryEntity } from '../entities/product-category.entity';

export const PRODUCT_CATEGORY_REPOSITORY = Symbol('PRODUCT_CATEGORY_REPOSITORY');

export interface CreateProductCategoryData {
  tenantId: string;
  name: string;
  slug: string;
  chipCostPercent?: number | null;
  shippingFee?: number | null;
}

export interface UpdateProductCategoryData {
  name?: string;
  chipCostPercent?: number | null;
  shippingFee?: number | null;
  active?: boolean;
}

export interface IProductCategoryRepository {
  create(data: CreateProductCategoryData): Promise<ProductCategoryEntity>;
  findAll(tenantId: string): Promise<ProductCategoryEntity[]>;
  findActive(tenantId: string): Promise<ProductCategoryEntity[]>;
  findById(id: string, tenantId: string): Promise<ProductCategoryEntity | null>;
  findBySlug(tenantId: string, slug: string): Promise<ProductCategoryEntity | null>;
  update(id: string, tenantId: string, data: UpdateProductCategoryData): Promise<ProductCategoryEntity>;
  delete(id: string, tenantId: string): Promise<void>;
}
