import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { INotificationReceiptRepository } from '../../domain/interfaces';

@Injectable()
export class NotificationReceiptRepository implements INotificationReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertForAdmin(notificationId: string, tenantId: string, adminId: string): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.tenantNotificationReceipt.upsert({
        where: {
          notification_id_tenant_id_admin_id: {
            notification_id: notificationId,
            tenant_id: tenantId,
            admin_id: adminId,
          },
        },
        create: {
          notification_id: notificationId,
          tenant_id: tenantId,
          admin_id: adminId,
          viewed: true,
          first_viewed_at: now,
          last_viewed_at: now,
        },
        update: {
          viewed: true,
          last_viewed_at: now,
        },
      });
    } catch (e) {
      throw new RepositoryException('Erro ao registrar visualização', e);
    }
  }

  async upsertTenantAggregate(notificationId: string, tenantId: string): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.tenantNotificationReceipt.upsert({
        where: {
          notification_id_tenant_id_admin_id: {
            notification_id: notificationId,
            tenant_id: tenantId,
            admin_id: null,
          },
        },
        create: {
          notification_id: notificationId,
          tenant_id: tenantId,
          admin_id: null,
          viewed: true,
          first_viewed_at: now,
          last_viewed_at: now,
        },
        update: {
          viewed: true,
          last_viewed_at: now,
        },
      });
    } catch (e) {
      throw new RepositoryException('Erro ao atualizar agregado do tenant', e);
    }
  }

  async findForTenant(tenantId: string, adminId: string, page: number, limit: number) {
    const where = { tenant_id: tenantId, admin_id: adminId };
    const [data, total] = await Promise.all([
      this.prisma.tenantNotificationReceipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { Notification: true },
      }),
      this.prisma.tenantNotificationReceipt.count({ where }),
    ]);
    return { data, total };
  }

  async countUnread(tenantId: string, adminId: string): Promise<number> {
    return this.prisma.tenantNotificationReceipt.count({
      where: { tenant_id: tenantId, admin_id: adminId, viewed: false },
    });
  }

  async createManyForTenant(notificationId: string, tenantIds: string[]): Promise<void> {
    try {
      await this.prisma.tenantNotificationReceipt.createMany({
        data: tenantIds.map(tenantId => ({
          notification_id: notificationId,
          tenant_id: tenantId,
          admin_id: null,
        })),
        skipDuplicates: true,
      });
    } catch (e) {
      throw new RepositoryException('Erro ao criar receipts', e);
    }
  }
}
