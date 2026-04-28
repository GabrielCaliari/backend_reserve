import { EUserSubscriptionStatus } from '../enums/user-subscription-status.enum';

export interface UserSubscriptionProps {
  id: string;
  userId: string;
  productId: string;
  productPriceId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: EUserSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserSubscriptionEntity {
  readonly id: string;
  readonly userId: string;
  readonly productId: string;
  readonly productPriceId: string;
  readonly stripeSubscriptionId: string;
  readonly stripeCustomerId: string;
  readonly stripePriceId: string;
  readonly status: EUserSubscriptionStatus;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly trialStart?: Date;
  readonly trialEnd?: Date;
  readonly canceledAt?: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserSubscriptionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.productId = props.productId;
    this.productPriceId = props.productPriceId;
    this.stripeSubscriptionId = props.stripeSubscriptionId;
    this.stripeCustomerId = props.stripeCustomerId;
    this.stripePriceId = props.stripePriceId;
    this.status = props.status;
    this.currentPeriodStart = props.currentPeriodStart;
    this.currentPeriodEnd = props.currentPeriodEnd;
    this.trialStart = props.trialStart;
    this.trialEnd = props.trialEnd;
    this.canceledAt = props.canceledAt;
    this.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    this.amount = props.amount;
    this.currency = props.currency;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Returns true if this subscription currently grants access to the product.
   * Access is granted when:
   *   - status is active or trialing AND current_period_end >= now
   *   - OR cancel_at_period_end is true with status=active and still within period
   */
  isActive(): boolean {
    const now = new Date();
    const isActiveStatus =
      this.status === EUserSubscriptionStatus.ACTIVE ||
      this.status === EUserSubscriptionStatus.TRIALING;
    const isWithinPeriod = this.currentPeriodEnd >= now;
    return isActiveStatus && isWithinPeriod;
  }
}
