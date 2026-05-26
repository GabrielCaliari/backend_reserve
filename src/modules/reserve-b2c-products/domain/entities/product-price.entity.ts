export interface ProductPriceProps {
  id: string;
  stripePriceId: string;
  productId: string;
  name: string;
  billingMode: 'unlimited' | 'limited' | 'one_time' | 'one_time_exp';
  interval?: 'month' | 'year' | 'week' | null;
  intervalCount?: number | null;
  unitAmount: number;
  currency: string;
  maxBillingCycles?: number | null;
  accessDurationDays?: number | null;
  active: boolean;
}

export class ProductPriceEntity {
  readonly id: string;
  readonly stripePriceId: string;
  readonly productId: string;
  readonly name: string;
  readonly billingMode: 'unlimited' | 'limited' | 'one_time' | 'one_time_exp';
  readonly interval?: 'month' | 'year' | 'week' | null;
  readonly intervalCount?: number | null;
  readonly unitAmount: number;
  readonly currency: string;
  readonly maxBillingCycles?: number | null;
  readonly accessDurationDays?: number | null;
  readonly active: boolean;

  constructor(props: ProductPriceProps) {
    this.id = props.id;
    this.stripePriceId = props.stripePriceId;
    this.productId = props.productId;
    this.name = props.name;
    this.billingMode = props.billingMode;
    this.interval = props.interval;
    this.intervalCount = props.intervalCount;
    this.unitAmount = props.unitAmount;
    this.currency = props.currency;
    this.maxBillingCycles = props.maxBillingCycles;
    this.accessDurationDays = props.accessDurationDays;
    this.active = props.active;
  }
}
