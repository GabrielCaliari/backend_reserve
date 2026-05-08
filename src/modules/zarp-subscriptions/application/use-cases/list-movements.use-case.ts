import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface MovementItem {
  id: string;
  source: 'b2b' | 'b2c';
  customerName: string | null;
  customerEmail: string;
  productName: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

type InternalMovementItem = MovementItem & { stripeCheckoutId?: string };

export interface ListMovementsFilter {
  source?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ListMovementsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tenantId: string,
    filter: ListMovementsFilter,
  ): Promise<{ data: MovementItem[]; total: number }> {
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const fetchSize = offset + limit;

    const src = filter.source && ['b2b', 'b2c'].includes(filter.source) ? filter.source : 'all';
    const includeB2B = src === 'all' || src === 'b2b';
    const includeB2C = src === 'all' || src === 'b2c';

    const [b2bRecords, b2cRecords, b2bTotal, b2cTotal] = await Promise.all([
      includeB2B ? this.fetchB2B(tenantId, filter.status, fetchSize) : [],
      includeB2C ? this.fetchB2C(tenantId, filter.status, fetchSize) : [],
      includeB2B ? this.countB2B(tenantId, filter.status) : 0,
      includeB2C ? this.countB2C(tenantId, filter.status) : 0,
    ]);

    const merged = [...b2bRecords, ...b2cRecords].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const data = merged.slice(offset, offset + limit).map(({ stripeCheckoutId: _, ...rest }) => rest);

    return {
      data,
      total: b2bTotal + b2cTotal,
    };
  }

  // ─── B2B ──────────────────────────────────────────────────────────────────────

  private async fetchB2B(
    tenantId: string,
    status: string | undefined,
    take: number,
  ): Promise<InternalMovementItem[]> {
    const where: any = { tenant_id: tenantId };
    if (status && status !== 'all') where.status = status;

    const records = await this.prisma.b2BPurchase.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: { product: { select: { name: true } } },
    });

    return records.map((r) => ({
      id: r.id,
      source: 'b2b' as const,
      customerName: r.customer_name ?? null,
      customerEmail: r.customer_email,
      productName: (r as any).product?.name ?? null,
      type: 'one-time',
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      createdAt: r.created_at,
      stripeCheckoutId: (r as any).stripe_checkout_id ?? undefined,
    }));
  }

  private async countB2B(tenantId: string, status: string | undefined): Promise<number> {
    const where: any = { tenant_id: tenantId };
    if (status && status !== 'all') where.status = status;
    return this.prisma.b2BPurchase.count({ where });
  }

  // ─── B2C ──────────────────────────────────────────────────────────────────────

  private async fetchB2C(
    tenantId: string,
    status: string | undefined,
    take: number,
  ): Promise<InternalMovementItem[]> {
    const where: any = { tenant_id: tenantId };
    if (status && status !== 'all') where.status = status;

    const sessions = await this.prisma.b2CCheckoutSession.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
    });

    if (sessions.length === 0) return [];

    const productIds = [...new Set(sessions.map((s: any) => s.product_id).filter(Boolean))];
    const products =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return sessions.map((s: any) => ({
      id: s.id,
      source: 'b2c' as const,
      customerName: s.customer_name ?? null,
      customerEmail: s.customer_email,
      productName: productMap.get(s.product_id) ?? null,
      type: 'one-time',
      amount: s.amount,
      currency: s.currency,
      status: s.status,
      createdAt: s.created_at,
      stripeCheckoutId: s.stripe_checkout_id ?? undefined,
    }));
  }

  private async countB2C(tenantId: string, status: string | undefined): Promise<number> {
    const where: any = { tenant_id: tenantId };
    if (status && status !== 'all') where.status = status;
    return this.prisma.b2CCheckoutSession.count({ where });
  }
}
