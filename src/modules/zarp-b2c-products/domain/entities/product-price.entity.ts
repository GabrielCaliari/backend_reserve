export interface ProductPriceProps {
  id: string;
  stripePriceId: string;
  productId: string;
  interval: 'month' | 'year' | 'week';
  intervalCount: number;
  unitAmount: number;
  currency: string;
  active: boolean;
}

export class ProductPriceEntity {
  readonly id: string;
  readonly stripePriceId: string;
  readonly productId: string;
  readonly interval: 'month' | 'year' | 'week';
  readonly intervalCount: number;
  readonly unitAmount: number;
  readonly currency: string;
  readonly active: boolean;

  constructor(props: ProductPriceProps) {
    this.id = props.id;
    this.stripePriceId = props.stripePriceId;
    this.productId = props.productId;
    this.interval = props.interval;
    this.intervalCount = props.intervalCount;
    this.unitAmount = props.unitAmount;
    this.currency = props.currency;
    this.active = props.active;
  }
}
