import { ESubscriptionStatus } from '../enums/subscription-status.enum';

export interface StripeSubscriptionProps {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId?: string;
  status: ESubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stripe Subscription Domain Entity
 * Pure TypeScript - NO NestJS decorators
 */
export class StripeSubscriptionEntity {
  private props: StripeSubscriptionProps;

  constructor(props: StripeSubscriptionProps) {
    this.props = props;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get stripeSubscriptionId(): string {
    return this.props.stripeSubscriptionId;
  }

  get stripeCustomerId(): string {
    return this.props.stripeCustomerId;
  }

  get stripePriceId(): string {
    return this.props.stripePriceId;
  }

  get stripeProductId(): string | undefined {
    return this.props.stripeProductId;
  }

  get status(): ESubscriptionStatus {
    return this.props.status;
  }

  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }

  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }

  get trialStart(): Date | undefined {
    return this.props.trialStart;
  }

  get trialEnd(): Date | undefined {
    return this.props.trialEnd;
  }

  get canceledAt(): Date | undefined {
    return this.props.canceledAt;
  }

  get cancelAtPeriodEnd(): boolean {
    return this.props.cancelAtPeriodEnd;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get interval(): string {
    return this.props.interval;
  }

  get intervalCount(): number {
    return this.props.intervalCount;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business Logic Methods

  /**
   * Check if subscription is active (including trial)
   */
  isActive(): boolean {
    return (
      this.props.status === ESubscriptionStatus.ACTIVE ||
      this.props.status === ESubscriptionStatus.TRIALING
    );
  }

  /**
   * Check if subscription is in trial period
   */
  isInTrial(): boolean {
    if (!this.props.trialEnd) return false;
    return (
      this.props.status === ESubscriptionStatus.TRIALING &&
      new Date() < this.props.trialEnd
    );
  }

  /**
   * Check if subscription is canceled but still active until period end
   */
  isCanceledButActive(): boolean {
    return (
      this.props.cancelAtPeriodEnd &&
      this.props.status === ESubscriptionStatus.ACTIVE &&
      new Date() < this.props.currentPeriodEnd
    );
  }

  /**
   * Get days remaining in current period
   */
  getDaysRemaining(): number {
    const now = new Date();
    const end = this.props.currentPeriodEnd;
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Get formatted amount (from cents to currency)
   */
  getFormattedAmount(): number {
    return this.props.amount / 100;
  }

  /**
   * Cancel subscription at period end
   */
  cancelAtPeriodEndAction(): void {
    this.props.cancelAtPeriodEnd = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Cancel subscription immediately
   */
  cancelImmediately(): void {
    this.props.status = ESubscriptionStatus.CANCELED;
    this.props.canceledAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Update subscription status
   */
  updateStatus(status: ESubscriptionStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  /**
   * Update period dates
   */
  updatePeriod(start: Date, end: Date): void {
    this.props.currentPeriodStart = start;
    this.props.currentPeriodEnd = end;
    this.props.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toObject(): StripeSubscriptionProps {
    return { ...this.props };
  }
}
