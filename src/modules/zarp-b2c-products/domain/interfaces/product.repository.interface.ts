import { ProductEntity } from '../entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  findAllActive(): Promise<ProductEntity[]>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
}
