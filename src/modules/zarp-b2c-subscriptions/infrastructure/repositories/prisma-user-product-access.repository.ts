import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { IUserProductAccessRepository } from '../../domain/interfaces/user-product-access.repository.interface';
import { UserProductAccess } from '../../domain/entities/user-product-access.entity';
import { EAccessType } from '../../domain/enums/product-type.enum';

@Injectable()
export class PrismaUserProductAccessRepository implements IUserProductAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<UserProductAccess | null> {
    const record = await this.prisma.userProductAccess.findFirst({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<UserProductAccess[]> {
    const records = await this.prisma.userProductAccess.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findExpiredAccess(now: Date): Promise<UserProductAccess[]> {
    const records = await this.prisma.userProductAccess.findMany({
      where: {
        access_type: EAccessType.TEMPORARY,
        status: 'active',
        access_expires_at: { lte: now },
      },
    });
    return records.map((r) => this.toDomain(r));
  }

  async hasActiveAccess(userId: string, productSlug: string): Promise<boolean> {
    const now = new Date();

    const access = await this.prisma.userProductAccess.findFirst({
      where: {
        user_id: userId,
        Product: { slug: productSlug },
        status: 'active',
        OR: [
          // Subscription ativa (unlimited ou limited)
          {
            access_type: EAccessType.SUBSCRIPTION,
            current_period_end: { gte: now },
          },
          // Vitalício
          {
            access_type: EAccessType.LIFETIME,
          },
          // Temporário ainda válido
          {
            access_type: EAccessType.TEMPORARY,
            access_expires_at: { gte: now },
          },
        ],
      },
    });

    return access !== null;
  }

  async create(data: Partial<UserProductAccess>): Promise<UserProductAccess> {
    const record = await this.prisma.userProductAccess.create({
      data: {
        tenant_id: data.tenant_id!,
        user_id: data.user_id ?? undefined,
        customer_id: data.customer_id ?? undefined,
        product_id: data.product_id!,
        product_price_id: data.product_price_id!,
        stripe_subscription_id: data.stripe_subscription_id,
        stripe_customer_id: data.stripe_customer_id!,
        stripe_price_id: data.stripe_price_id!,
        stripe_payment_intent_id: data.stripe_payment_intent_id,
        access_type: data.access_type!,
        status: data.status!,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        trial_start: data.trial_start,
        trial_end: data.trial_end,
        access_granted_at: data.access_granted_at || new Date(),
        access_expires_at: data.access_expires_at,
        max_billing_cycles: data.max_billing_cycles,
        completed_billing_cycles: data.completed_billing_cycles || 0,
        amount: data.amount!,
        currency: data.currency!,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: Partial<UserProductAccess>): Promise<UserProductAccess> {
    const record = await this.prisma.userProductAccess.update({
      where: { id },
      data: {
        status: data.status,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        trial_start: data.trial_start,
        trial_end: data.trial_end,
        canceled_at: data.canceled_at,
        cancel_at_period_end: data.cancel_at_period_end,
        completed_billing_cycles: data.completed_billing_cycles,
        access_expires_at: data.access_expires_at,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: any): UserProductAccess {
    return {
      id: record.id,
      tenant_id: record.tenant_id,
      user_id: record.user_id,
      customer_id: record.customer_id,
      product_id: record.product_id,
      product_price_id: record.product_price_id,
      stripe_subscription_id: record.stripe_subscription_id,
      stripe_customer_id: record.stripe_customer_id,
      stripe_price_id: record.stripe_price_id,
      stripe_payment_intent_id: record.stripe_payment_intent_id,
      access_type: record.access_type,
      status: record.status,
      current_period_start: record.current_period_start,
      current_period_end: record.current_period_end,
      cancel_at_period_end: record.cancel_at_period_end,
      canceled_at: record.canceled_at,
      trial_start: record.trial_start,
      trial_end: record.trial_end,
      access_granted_at: record.access_granted_at,
      access_expires_at: record.access_expires_at,
      max_billing_cycles: record.max_billing_cycles,
      completed_billing_cycles: record.completed_billing_cycles,
      amount: record.amount,
      currency: record.currency,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}
