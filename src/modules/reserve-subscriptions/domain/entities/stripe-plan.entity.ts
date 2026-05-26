/**
 * Stripe Plan Domain Entity
 * Pure TypeScript — NO NestJS decorators
 *
 * Represents a product+price pair managed via the Stripe API.
 * Admins create plans through the panel; the entity is synced to Stripe
 * and persisted locally so the application never depends on the Stripe
 * Dashboard for day-to-day operations.
 */

export interface StripePlanProps {
  id: string;
  slug: string;
  planName: string;
  description?: string;

  // Stripe IDs
  stripeProductId: string;
  stripePriceId: string;          // recurring price
  stripeTrialPriceId?: string;    // optional free-trial price

  // Billing
  billingInterval: number;        // 1=weekly 2=monthly 3=quarterly 4=annual
  unitAmount: number;             // in cents
  currency: string;               // 'brl' | 'usd'

  // Credits / limits
  releasedCredits: number;
  creditsReleasedTrialPeriod: number;
  guestLimit: number;
  trialDays: number;

  // Control
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class StripePlanEntity {
  private props: StripePlanProps;

  constructor(props: StripePlanProps) {
    this.props = props;
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get id(): string { return this.props.id; }
  get slug(): string { return this.props.slug; }
  get planName(): string { return this.props.planName; }
  get description(): string | undefined { return this.props.description; }
  get stripeProductId(): string { return this.props.stripeProductId; }
  get stripePriceId(): string { return this.props.stripePriceId; }
  get stripeTrialPriceId(): string | undefined { return this.props.stripeTrialPriceId; }
  get billingInterval(): number { return this.props.billingInterval; }
  get unitAmount(): number { return this.props.unitAmount; }
  get currency(): string { return this.props.currency; }
  get releasedCredits(): number { return this.props.releasedCredits; }
  get creditsReleasedTrialPeriod(): number { return this.props.creditsReleasedTrialPeriod; }
  get guestLimit(): number { return this.props.guestLimit; }
  get trialDays(): number { return this.props.trialDays; }
  get active(): boolean { return this.props.active; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // ─── Business Logic ────────────────────────────────────────────────────────

  /** Returns the formatted price in the plan's currency (cents → decimal) */
  getFormattedAmount(): number {
    return this.props.unitAmount / 100;
  }

  /** Returns true if the plan has a trial configured */
  hasTrial(): boolean {
    return this.props.trialDays > 0 && this.props.creditsReleasedTrialPeriod > 0;
  }

  /** Archive the plan (soft-delete — preserves billing history) */
  archive(): void {
    this.props.active = false;
    this.props.updatedAt = new Date();
  }

  /** Convert to plain object */
  toObject(): StripePlanProps {
    return { ...this.props };
  }
}
