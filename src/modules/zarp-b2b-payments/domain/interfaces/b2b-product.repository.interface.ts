import { B2BProductEntity } from '../entities/b2b-product.entity';

export const B2B_PRODUCT_REPOSITORY = Symbol('B2B_PRODUCT_REPOSITORY');

export interface CreateB2BProductData {
  tenantId: string;
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description?: string;
  slug: string;
  categories?: string[];
  price: number;
  currency: string;
  categoryId?: string | null;
  requiresShipping?: boolean;
  chipCostOverride?: number | null;
  shippingFeeOverride?: number | null;
}

export interface UpdateB2BProductFeeData {
  categoryId?: string | null;
  chipCostOverride?: number | null;
  shippingFeeOverride?: number | null;
  requiresShipping?: boolean;
}

export interface IB2BProductRepository {
  create(data: CreateB2BProductData): Promise<B2BProductEntity>;
  findAllByTenant(tenantId: string): Promise<B2BProductEntity[]>;
  findById(id: string, tenantId: string): Promise<B2BProductEntity | null>;
  findBySlug(tenantId: string, slug: string): Promise<B2BProductEntity | null>;
  findByStripeProductId(tenantId: string, stripeProductId: string): Promise<B2BProductEntity | null>;
  findByCategoryId(tenantId: string, categoryId: string): Promise<B2BProductEntity[]>;
  updateFees(id: string, tenantId: string, data: UpdateB2BProductFeeData): Promise<B2BProductEntity>;
  deactivate(id: string, tenantId: string): Promise<void>;
}
