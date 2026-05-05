import { EBillingInterval, EBillingCollectionMode } from '../enums/billing-interval.enum';

export interface TenantBillingConfigProps {
  id: string;
  tenantId: string;

  // Stripe keys (per-tenant)
  stripePublishableKey?: string;
  stripePriceIds?: Record<string, string>; // { monthly: 'price_xxx', annual: 'price_yyy' }

  // Billing behavior
  billingInterval: EBillingInterval;
  billingCollectionMode: EBillingCollectionMode;

  // Trial
  trialEnabled: boolean;
  trialDays: number;

  // Display
  currency: string;
  planName?: string;
  planDescription?: string;

  // Redirect URLs after Stripe Checkout (per-tenant)
  checkoutSuccessUrl?: string;
  checkoutCancelUrl?: string;

  metadata?: Record<string, any>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant Billing Config Domain Entity
 * Pure TypeScript — NO NestJS decorators
 */
export class TenantBillingConfigEntity {
  private props: TenantBillingConfigProps;

  constructor(props: TenantBillingConfigProps) {
    this.props = props;
  }

  get id() { return this.props.id; }
  get tenantId() { return this.props.tenantId; }
  get stripePublishableKey() { return this.props.stripePublishableKey; }
  get stripePriceIds() { return this.props.stripePriceIds; }
  get billingInterval() { return this.props.billingInterval; }
  get billingCollectionMode() { return this.props.billingCollectionMode; }
  get trialEnabled() { return this.props.trialEnabled; }
  get trialDays() { return this.props.trialDays; }
  get currency() { return this.props.currency; }
  get planName() { return this.props.planName; }
  get planDescription() { return this.props.planDescription; }
  get checkoutSuccessUrl() { return this.props.checkoutSuccessUrl; }
  get checkoutCancelUrl() { return this.props.checkoutCancelUrl; }
  get metadata() { return this.props.metadata; }
  get active() { return this.props.active; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  /** Returns the price_id for the configured interval, or undefined */
  getPriceIdForInterval(interval?: EBillingInterval): string | undefined {
    const key = interval ?? this.props.billingInterval;
    return this.props.stripePriceIds?.[key];
  }

  /** Returns the active price_id based on the configured interval */
  getActivePriceId(): string | undefined {
    return this.getPriceIdForInterval(this.props.billingInterval);
  }

  toObject(): TenantBillingConfigProps {
    return { ...this.props };
  }
}
