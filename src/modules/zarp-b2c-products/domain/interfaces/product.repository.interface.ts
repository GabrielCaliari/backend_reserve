import { ProductEntity } from '../entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  findAllActive(tenantId: string): Promise<ProductEntity[]>;
  findBySlug(tenantId: string, slug: string): Promise<ProductEntity | null>;
}
