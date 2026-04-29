import { B2BProductEntity } from '../entities/b2b-product.entity';

export const B2B_PRODUCT_REPOSITORY = Symbol('B2B_PRODUCT_REPOSITORY');

export interface CreateB2BProductData {
  tenantId: string;
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
}

export interface IB2BProductRepository {
  create(data: CreateB2BProductData): Promise<B2BProductEntity>;
  findAllByTenant(tenantId: string): Promise<B2BProductEntity[]>;
  findById(id: string, tenantId: string): Promise<B2BProductEntity | null>;
  findByStripeProductId(tenantId: string, stripeProductId: string): Promise<B2BProductEntity | null>;
  deactivate(id: string, tenantId: string): Promise<void>;
}
