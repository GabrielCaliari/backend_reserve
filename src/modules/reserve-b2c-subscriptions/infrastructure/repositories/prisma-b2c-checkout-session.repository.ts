import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2CCheckoutSessionRepository,
  CreateB2CCheckoutSessionData,
} from '../../domain/interfaces/b2c-checkout-session.repository.interface';
import {
  B2CCheckoutSessionEntity,
  B2CCheckoutStatus,
} from '../../domain/entities/b2c-checkout-session.entity';

@Injectable()
export class PrismaB2CCheckoutSessionRepository implements IB2CCheckoutSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateB2CCheckoutSessionData): Promise<B2CCheckoutSessionEntity> {
    const record = await this.prisma.b2CCheckoutSession.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId ?? null,
        product_id: data.productId,
        price_id: data.priceId,
        stripe_checkout_id: data.stripeCheckoutId,
        stripe_price_id: data.stripePriceId,
        status: 'pending',
        amount: data.amount,
        currency: data.currency,
        customer_email: data.customerEmail,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        is_lead_purchase: data.isLeadPurchase ?? false,
        metadata: data.metadata ?? undefined,
      },
    });
    return this.toDomain(record);
  }

  async findByStripeCheckoutId(stripeCheckoutId: string): Promise<B2CCheckoutSessionEntity | null> {
    const record = await this.prisma.b2CCheckoutSession.findUnique({
      where: { stripe_checkout_id: stripeCheckoutId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByTenant(
    tenantId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ data: B2CCheckoutSessionEntity[]; total: number }> {
    const where: any = { tenant_id: tenantId };
    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }

    const [records, total] = await Promise.all([
      this.prisma.b2CCheckoutSession.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.b2CCheckoutSession.count({ where }),
    ]);

    return { data: records.map((r) => this.toDomain(r)), total };
  }

  async updateStatus(
    stripeCheckoutId: string,
    status: B2CCheckoutStatus,
    completedAt?: Date,
    expiredAt?: Date,
  ): Promise<void> {
    await this.prisma.b2CCheckoutSession.update({
      where: { stripe_checkout_id: stripeCheckoutId },
      data: {
        status,
        ...(completedAt && { checkout_completed_at: completedAt }),
        ...(expiredAt && { checkout_expired_at: expiredAt }),
      },
    });
  }

  private toDomain(record: any): B2CCheckoutSessionEntity {
    return new B2CCheckoutSessionEntity({
      id: record.id,
      tenantId: record.tenant_id,
      userId: record.user_id,
      productId: record.product_id,
      priceId: record.price_id,
      stripeCheckoutId: record.stripe_checkout_id,
      stripePriceId: record.stripe_price_id,
      status: record.status as B2CCheckoutStatus,
      amount: record.amount,
      currency: record.currency,
      customerEmail: record.customer_email,
      customerName: record.customer_name,
      customerPhone: record.customer_phone,
      isLeadPurchase: record.is_lead_purchase,
      checkoutStartedAt: record.checkout_started_at,
      checkoutCompletedAt: record.checkout_completed_at,
      checkoutExpiredAt: record.checkout_expired_at,
      metadata: record.metadata,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }
}
