import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IStripeSubscriptionRepository } from '../../domain/interfaces/stripe-subscription.repository.interface';
import { StripeSubscriptionEntity } from '../../domain/entities/stripe-subscription.entity';
import { ESubscriptionStatus } from '../../domain/enums/subscription-status.enum';

@Injectable()
export class PrismaStripeSubscriptionRepository implements IStripeSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity> {
    const data = await this.prisma.stripeSubscription.create({
      data: {
        tenant_id: subscription.tenantId,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        stripe_customer_id: subscription.stripeCustomerId,
        stripe_price_id: subscription.stripePriceId,
        stripe_product_id: subscription.stripeProductId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        trial_start: subscription.trialStart,
        trial_end: subscription.trialEnd,
        canceled_at: subscription.canceledAt,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval,
        interval_count: subscription.intervalCount,
        metadata: subscription.metadata,
      },
    });

    return this.toDomain(data);
  }

  async findById(id: string): Promise<StripeSubscriptionEntity | null> {
    const data = await this.prisma.stripeSubscription.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<StripeSubscriptionEntity | null> {
    const data = await this.prisma.stripeSubscription.findUnique({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });

    return data ? this.toDomain(data) : null;
  }

  async findActiveByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null> {
    const data = await this.prisma.stripeSubscription.findFirst({
      where: {
        tenant_id: tenantId,
        status: {
          in: [ESubscriptionStatus.ACTIVE, ESubscriptionStatus.TRIALING],
        },
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByTenantId(tenantId: string): Promise<StripeSubscriptionEntity | null> {
    const data = await this.prisma.stripeSubscription.findUnique({
      where: { tenant_id: tenantId },
    });

    return data ? this.toDomain(data) : null;
  }

  async update(subscription: StripeSubscriptionEntity): Promise<StripeSubscriptionEntity> {
    const data = await this.prisma.stripeSubscription.update({
      where: { id: subscription.id },
      data: {
        stripe_subscription_id: subscription.stripeSubscriptionId,
        stripe_customer_id: subscription.stripeCustomerId,
        stripe_price_id: subscription.stripePriceId,
        stripe_product_id: subscription.stripeProductId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        trial_start: subscription.trialStart,
        trial_end: subscription.trialEnd,
        canceled_at: subscription.canceledAt,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval,
        interval_count: subscription.intervalCount,
        metadata: subscription.metadata,
        updated_at: new Date(),
      },
    });

    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.stripeSubscription.delete({
      where: { id },
    });
  }

  async updateTenantStripeFields(
    tenantId: string,
    fields: { stripeCustomerId?: string; subscriptionStatus?: string },
  ): Promise<void> {
    const data: any = {};
    if (fields.stripeCustomerId !== undefined) data.stripe_customer_id = fields.stripeCustomerId;
    if (fields.subscriptionStatus !== undefined) data.subscription_status = fields.subscriptionStatus;
    if (Object.keys(data).length === 0) return;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  private toDomain(data: any): StripeSubscriptionEntity {
    return new StripeSubscriptionEntity({
      id: data.id,
      tenantId: data.tenant_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
      stripePriceId: data.stripe_price_id,
      stripeProductId: data.stripe_product_id,
      status: data.status as ESubscriptionStatus,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      trialStart: data.trial_start,
      trialEnd: data.trial_end,
      canceledAt: data.canceled_at,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      intervalCount: data.interval_count,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }
}
