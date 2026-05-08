import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface B2CAccessListItem {
  id: string;
  userId: string;
  productId: string;
  productName?: string;
  accessType: string;
  status: string;
  amount: number;
  currency: string;
  accessGrantedAt: Date;
  accessExpiresAt: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
}

@Injectable()
export class ListB2CAccessesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tenantId: string,
    options?: { limit?: number; offset?: number; status?: string },
  ): Promise<{ data: B2CAccessListItem[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where: any = { tenant_id: tenantId };
    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }

    const [records, total] = await Promise.all([
      this.prisma.userProductAccess.findMany({
        where,
        include: { Product: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.userProductAccess.count({ where }),
    ]);

    return {
      data: records.map((r) => ({
        id: r.id,
        userId: r.user_id,
        productId: r.product_id,
        productName: (r as any).Product?.name,
        accessType: r.access_type,
        status: r.status,
        amount: r.amount,
        currency: r.currency,
        accessGrantedAt: r.access_granted_at,
        accessExpiresAt: r.access_expires_at,
        currentPeriodEnd: r.current_period_end,
        createdAt: r.created_at,
      })),
      total,
    };
  }
}
