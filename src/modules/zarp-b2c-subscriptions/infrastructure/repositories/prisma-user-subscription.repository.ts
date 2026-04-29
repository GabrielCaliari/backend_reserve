import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IUserSubscriptionRepository,
  CreateUserSubscriptionData,
  UpdateUserSubscriptionData,
} from '../../domain/interfaces/user-subscription.repository.interface';
import { UserSubscriptionEntity } from '../../domain/entities/user-subscription.entity';
import { EUserSubscriptionStatus } from '../../domain/enums/user-subscription-status.enum';

@Injectable()
export class PrismaUserSubscriptionRepository implements IUserSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserSubscriptionData): Promise<UserSubscriptionEntity> {
    const record = await this.prisma.userSubscription.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId,
        product_id: data.productId,
        product_price_id: data.productPriceId,
        stripe_subscription_id: data.stripeSubscriptionId,
        stripe_customer_id: data.stripeCustomerId,
        stripe_price_id: data.stripePriceId,
        status: data.status,
        current_period_start: data.currentPeriodStart,
        current_period_end: data.currentPeriodEnd,
        trial_start: data.trialStart,
        trial_end: data.trialEnd,
        amount: data.amount,
        currency: data.currency,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<UserSubscriptionEntity | null> {
    const record = await this.prisma.userSubscription.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByStripeSubscriptionId(
    tenantId: string,
    stripeSubId: string,
  ): Promise<UserSubscriptionEntity | null> {
    const record = await this.prisma.userSubscription.findUnique({
      where: {
        tenant_id_stripe_subscription_id: {
          tenant_id: tenantId,
          stripe_subscription_id: stripeSubId,
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAllByUserId(userId: string): Promise<UserSubscriptionEntity[]> {
    const records = await this.prisma.userSubscription.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async hasActiveSubscription(userId: string, productSlug: string): Promise<boolean> {
    const now = new Date();
    const record = await this.prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trialing'] },
        current_period_end: { gte: now },
        Product: { slug: productSlug },
      },
    });
    return record !== null;
  }

  async updateByStripeSubscriptionId(
    tenantId: string,
    stripeSubId: string,
    data: UpdateUserSubscriptionData,
  ): Promise<void> {
    await this.prisma.userSubscription.update({
      where: {
        tenant_id_stripe_subscription_id: {
          tenant_id: tenantId,
          stripe_subscription_id: stripeSubId,
        },
      },
      data: {
        status: data.status,
        current_period_start: data.currentPeriodStart,
        current_period_end: data.currentPeriodEnd,
        cancel_at_period_end: data.cancelAtPeriodEnd,
        canceled_at: data.canceledAt,
      },
    });
  }

  private toDomain(record: any): UserSubscriptionEntity {
    return new UserSubscriptionEntity({
      id: record.id,
      userId: record.user_id,
      productId: record.product_id,
      productPriceId: record.product_price_id,
      stripeSubscriptionId: record.stripe_subscription_id,
      stripeCustomerId: record.stripe_customer_id,
      stripePriceId: record.stripe_price_id,
      status: record.status as EUserSubscriptionStatus,
      currentPeriodStart: record.current_period_start,
      currentPeriodEnd: record.current_period_end,
      trialStart: record.trial_start ?? undefined,
      trialEnd: record.trial_end ?? undefined,
      canceledAt: record.canceled_at ?? undefined,
      cancelAtPeriodEnd: record.cancel_at_period_end,
      amount: record.amount,
      currency: record.currency,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
