import { ProductPriceEntity } from './product-price.entity';

export interface ProductProps {
  id: string;
  stripeProductId: string;
  name: string;
  description?: string;
  slug: string;
  categories: string[];          // array legado mantido por compatibilidade
  categoryId: string | null;     // FK para ProductCategory
  active: boolean;
  requiresShipping: boolean;     // true para produtos físicos (books, tabs)
  chipCostOverride: number | null;    // % override. null = herda da categoria/tenant
  shippingFeeOverride: number | null; // centavos override. null = herda da categoria/tenant
  prices: ProductPriceEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProductEntity {
  readonly id: string;
  readonly stripeProductId: string;
  readonly name: string;
  readonly description?: string;
  readonly slug: string;
  readonly categories: string[];
  readonly categoryId: string | null;
  readonly active: boolean;
  readonly requiresShipping: boolean;
  readonly chipCostOverride: number | null;
  readonly shippingFeeOverride: number | null;
  readonly prices: ProductPriceEntity[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ProductProps) {
    this.id = props.id;
    this.stripeProductId = props.stripeProductId;
    this.name = props.name;
    this.description = props.description;
    this.slug = props.slug;
    this.categories = props.categories;
    this.categoryId = props.categoryId;
    this.active = props.active;
    this.requiresShipping = props.requiresShipping;
    this.chipCostOverride = props.chipCostOverride;
    this.shippingFeeOverride = props.shippingFeeOverride;
    this.prices = props.prices;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
