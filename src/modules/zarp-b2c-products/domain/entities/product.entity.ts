import { ProductPriceEntity } from './product-price.entity';

export interface ProductProps {
  id: string;
  stripeProductId: string;
  name: string;
  description?: string;
  slug: string;
  categories: string[];
  active: boolean;
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
  readonly active: boolean;
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
    this.active = props.active;
    this.prices = props.prices;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
