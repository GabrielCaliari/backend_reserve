import { ProductPriceEntity } from '../entities/product-price.entity';

export const PRODUCT_PRICE_REPOSITORY = Symbol('PRODUCT_PRICE_REPOSITORY');

export interface CreateProductPriceData {
  tenantId: string;
  productId: string;
  stripePriceId: string;
  interval: 'month' | 'year' | 'week';
  intervalCount: number;
  unitAmount: number;
  currency: string;
}

export interface IProductPriceRepository {
  create(data: CreateProductPriceData): Promise<ProductPriceEntity>;
  findActiveByProductId(productId: string): Promise<ProductPriceEntity[]>;
  findByStripePriceId(tenantId: string, stripePriceId: string): Promise<ProductPriceEntity | null>;
}
