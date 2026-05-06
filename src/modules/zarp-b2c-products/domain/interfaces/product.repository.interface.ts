import { ProductEntity } from '../entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface CreateProductData {
  tenantId: string;
  stripeProductId: string;
  name: string;
  description?: string;
  slug: string;
  categories?: string[];
  categoryId?: string | null;
  requiresShipping?: boolean;
  chipCostOverride?: number | null;
  shippingFeeOverride?: number | null;
}

export interface UpdateProductFeeData {
  categoryId?: string | null;
  chipCostOverride?: number | null;
  shippingFeeOverride?: number | null;
  requiresShipping?: boolean;
}

export interface IProductRepository {
  create(data: CreateProductData): Promise<ProductEntity>;
  findAllActive(tenantId: string): Promise<ProductEntity[]>;
  findAll(tenantId: string): Promise<ProductEntity[]>;
  findBySlug(tenantId: string, slug: string): Promise<ProductEntity | null>;
  findById(id: string, tenantId: string): Promise<ProductEntity | null>;
  findByCategoryId(tenantId: string, categoryId: string): Promise<ProductEntity[]>;
  updateFees(id: string, tenantId: string, data: UpdateProductFeeData): Promise<ProductEntity>;
}
