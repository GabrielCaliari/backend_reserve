import { ProductEntity } from '../entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface CreateProductData {
  tenantId: string;
  stripeProductId: string;
  name: string;
  description?: string;
  slug: string;
  categories?: string[];
}

export interface IProductRepository {
  create(data: CreateProductData): Promise<ProductEntity>;
  findAllActive(tenantId: string): Promise<ProductEntity[]>;
  findAll(tenantId: string): Promise<ProductEntity[]>;
  findBySlug(tenantId: string, slug: string): Promise<ProductEntity | null>;
  findById(id: string, tenantId: string): Promise<ProductEntity | null>;
}
