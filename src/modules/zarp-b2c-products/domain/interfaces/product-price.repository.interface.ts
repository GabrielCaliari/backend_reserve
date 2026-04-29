import { ProductPriceEntity } from '../entities/product-price.entity';

export const PRODUCT_PRICE_REPOSITORY = Symbol('PRODUCT_PRICE_REPOSITORY');

export interface IProductPriceRepository {
  findActiveByProductId(productId: string): Promise<ProductPriceEntity[]>;
  findByStripePriceId(tenantId: string, stripePriceId: string): Promise<ProductPriceEntity | null>;
}
