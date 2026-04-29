import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IB2BPurchaseRepository,
  CreateB2BPurchaseData,
  UpdateB2BPurchaseData,
  ListB2BPurchasesFilter,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { B2BPurchaseEntity } from '../../domain/entities/b2b-purchase.entity';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';

@Injectable()
export class PrismaB2BPurchaseRepository implements IB2BPurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateB2BPurchaseData): Promise<B2BPurchaseEntity> {
    const record = await this.prisma.b2BPurchase.create({
      data: {
        tenant_id: data.tenantId,
        product_id: data.productId,
        stripe_checkout_id: data.stripeCheckoutId,
        amount: data.amount,
        currency: data.currency,
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        status: EPurchaseStatus.PENDING,
        checkout_started_at: new Date(),
        metadata: data.metadata as any,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string, tenantId: string): Promise<B2BPurchaseEntity | null> {
    const record = await this.prisma.b2BPurchase.findFirst({
      where: { id, tenant_id: tenantId },
      include: { product: { select: { name: true } } },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByStripeCheckoutId(
    tenantId: string,
    checkoutId: string,
  ): Promise<B2BPurchaseEntity | null> {
    const record = await this.prisma.b2BPurchase.findUnique({
      where: {
        tenant_id_stripe_checkout_id: {
          tenant_id: tenantId,
          stripe_checkout_id: checkoutId,
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAllByTenant(
    tenantId: string,
    filter: ListB2BPurchasesFilter,
  ): Promise<{ data: B2BPurchaseEntity[]; total: number }> {
    const where: any = { tenant_id: tenantId };
    if (filter.status && filter.status !== 'all') {
      where.status = filter.status;
    }

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const [records, total] = await Promise.all([
      this.prisma.b2BPurchase.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: { product: { select: { name: true } } },
      }),
      this.prisma.b2BPurchase.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
    };
  }

  async updateByStripeCheckoutId(
    tenantId: string,
    checkoutId: string,
    data: UpdateB2BPurchaseData,
  ): Promise<void> {
    await this.prisma.b2BPurchase.updateMany({
      where: { tenant_id: tenantId, stripe_checkout_id: checkoutId },
      data: {
        status: data.status,
        stripe_payment_intent: data.stripePaymentIntent,
        user_id: data.userId,
        checkout_completed_at: data.checkoutCompletedAt,
        checkout_abandoned_at: data.checkoutAbandonedAt,
      },
    });
  }

  async countByStatus(tenantId: string, status: EPurchaseStatus): Promise<number> {
    return this.prisma.b2BPurchase.count({
      where: { tenant_id: tenantId, status },
    });
  }

  async getTotalRevenue(tenantId: string): Promise<number> {
    const result = await this.prisma.b2BPurchase.aggregate({
      where: { tenant_id: tenantId, status: EPurchaseStatus.COMPLETED },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  private toDomain(record: any): B2BPurchaseEntity {
    return new B2BPurchaseEntity(
      record.id,
      record.tenant_id,
      record.user_id ?? null,
      record.product_id,
      record.product?.name ?? null,       // included via JOIN
      record.stripe_checkout_id ?? null,
      record.stripe_payment_intent ?? null,
      record.checkout_started_at ?? null,
      record.checkout_completed_at ?? null,
      record.checkout_abandoned_at ?? null,
      record.status as EPurchaseStatus,
      record.amount,
      record.currency,
      record.customer_email,
      record.customer_name ?? null,
      record.customer_phone ?? null,
      record.metadata ?? null,
      record.created_at,
      record.updated_at,
    );
  }
}
