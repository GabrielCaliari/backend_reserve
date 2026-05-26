import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

export interface B2CAccessItem {
  id: string;
  customerName: string | null;
  customerEmail: string;
  productName: string | null;
  accessType: string;
  status: string;
  amount: number;
  currency: string;
  accessGrantedAt: Date;
  accessExpiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ListB2CAccessesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tenantId: string,
    filter: { status?: string; limit?: number; offset?: number },
  ): Promise<{ data: B2CAccessItem[]; total: number }> {
    const where: any = { tenant_id: tenantId };
    if (filter.status && filter.status !== 'all') where.status = filter.status;

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const [records, total] = await Promise.all([
      this.prisma.userProductAccess.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          User: { select: { name: true, email: true } },
          Product: { select: { name: true } },
        },
      }),
      this.prisma.userProductAccess.count({ where }),
    ]);

    return {
      data: records.map((r: any) => ({
        id: r.id,
        customerName: r.User?.name ?? null,
        customerEmail: r.User?.email ?? '',
        productName: r.Product?.name ?? null,
        accessType: r.access_type,
        status: r.status,
        amount: r.amount,
        currency: r.currency,
        accessGrantedAt: r.access_granted_at,
        accessExpiresAt: r.access_expires_at ?? null,
        createdAt: r.created_at,
      })),
      total,
    };
  }
}
