export interface ProductCategoryProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  chipCostPercent: number | null; // % sobre o preço. null = herda do tenant
  shippingFee: number | null;     // centavos fixo. null = herda do tenant
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductCategoryEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly chipCostPercent: number | null;
  readonly shippingFee: number | null;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ProductCategoryProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.slug = props.slug;
    this.chipCostPercent = props.chipCostPercent;
    this.shippingFee = props.shippingFee;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
