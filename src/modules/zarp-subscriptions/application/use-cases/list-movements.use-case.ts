import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface MovementItem {
  id: string;
  source: 'b2b' | 'b2c';
  productName: string;
  customerEmail: string;
  customerName: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface ListMovementsResult {
  data: MovementItem[];
  total: number;
}

@Injectable()
export class ListMovementsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tenantId: string,
    options?: {
      source?: 'b2b' | 'b2c' | 'all';
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ListMovementsResult> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const source = options?.source ?? 'all';

    const movements: MovementItem[] = [];

    // ── B2B Purchases ──────────────────────────────────────────────────────────
    if (source === 'all' || source === 'b2b') {
      const b2bWhere: any = { tenant_id: tenantId };
      if (options?.status && options.status !== 'all') {
        b2bWhere.status = options.status;
      }

      const b2bPurchases = await this.prisma.b2BPurchase.findMany({
        where: b2bWhere,
        include: { product: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        take: source === 'b2b' ? limit : undefined,
        skip: source === 'b2b' ? offset : undefined,
      });

      for (const p of b2bPurchases) {
        movements.push({
          id: p.id,
          source: 'b2b',
          productName: (p as any).product?.name ?? 'Unknown',
          customerEmail: p.customer_email,
          customerName: p.customer_name ?? null,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.created_at,
        });
      }
    }

    // ── B2C User Product Access + Checkout Sessions ───────────────────────────
    if (source === 'all' || source === 'b2c') {
      const b2cWhere: any = { tenant_id: tenantId };
      if (options?.status && options.status !== 'all') {
        b2cWhere.status = options.status;
      }

      // Completed accesses
      const b2cAccesses = await this.prisma.userProductAccess.findMany({
        where: b2cWhere,
        include: {
          Product: { select: { name: true } },
          User: { select: { email: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: source === 'b2c' ? limit : undefined,
        skip: source === 'b2c' ? offset : undefined,
      });

      for (const a of b2cAccesses) {
        movements.push({
          id: a.id,
          source: 'b2c',
          productName: (a as any).Product?.name ?? 'Unknown',
          customerEmail: (a as any).User?.email ?? '',
          customerName: (a as any).User?.name ?? null,
          amount: a.amount,
          currency: a.currency,
          status: a.status,
          createdAt: a.created_at,
        });
      }

      // Pending checkouts (not yet completed)
      const pendingWhere: any = { tenant_id: tenantId };
      if (!options?.status || options.status === 'all') {
        pendingWhere.status = 'pending';
      } else if (options.status === 'pending') {
        pendingWhere.status = 'pending';
      }

      if (!options?.status || options.status === 'all' || options.status === 'pending' || options.status === 'expired') {
        try {
          const checkoutSessions = await this.prisma.b2CCheckoutSession.findMany({
            where: options?.status && options.status !== 'all'
              ? { tenant_id: tenantId, status: options.status }
              : { tenant_id: tenantId, status: { in: ['pending', 'expired', 'abandoned'] } },
            orderBy: { created_at: 'desc' },
          });

          for (const cs of checkoutSessions) {
            movements.push({
              id: cs.id,
              source: 'b2c',
              productName: 'Checkout ' + cs.status,
              customerEmail: cs.customer_email,
              customerName: cs.customer_name ?? null,
              amount: cs.amount,
              currency: cs.currency,
              status: cs.status,
              createdAt: cs.created_at,
            });
          }
        } catch {
          // Non-critical — b2c_checkout_sessions may not be available yet
        }
      }
    }

    // Sort combined results by date desc and paginate if source === 'all'
    if (source === 'all') {
      movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const total = movements.length;
      return {
        data: movements.slice(offset, offset + limit),
        total,
      };
    }

    return {
      data: movements,
      total: movements.length,
    };
  }
}
