import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { EUserSubscriptionStatus } from '../enums/user-subscription-status.enum';

export const USER_SUBSCRIPTION_REPOSITORY = Symbol('USER_SUBSCRIPTION_REPOSITORY');

export interface CreateUserSubscriptionData {
  tenantId: string;
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
  amount: number;
  currency: string;
}

export interface UpdateUserSubscriptionData {
  status?: EUserSubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
}

export interface IUserSubscriptionRepository {
  create(data: CreateUserSubscriptionData): Promise<UserSubscriptionEntity>;
  findById(id: string): Promise<UserSubscriptionEntity | null>;
  findByStripeSubscriptionId(tenantId: string, stripeSubId: string): Promise<UserSubscriptionEntity | null>;
  findAllByUserId(userId: string): Promise<UserSubscriptionEntity[]>;
  hasActiveSubscription(userId: string, productSlug: string): Promise<boolean>;
  updateByStripeSubscriptionId(
    tenantId: string,
    stripeSubId: string,
    data: UpdateUserSubscriptionData,
  ): Promise<void>;
}
