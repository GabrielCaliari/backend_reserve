import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  INotificationRepository,
  ICreateNotification,
  IUpdateNotification,
  IListNotificationsFilter,
} from '../../domain/interfaces';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateNotification) {
    try {
      return await this.prisma.notification.create({
        data: { ...data, tenant_ids: data.tenant_ids ?? [] },
      });
    } catch (e) {
      throw new RepositoryException('Erro ao criar notificação', e);
    }
  }

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      include: { Admin: true },
    });
  }

  async findAll(filter: IListNotificationsFilter) {
    const where: any = {};
    if (filter.type) where.type = filter.type;
    if (filter.scope) where.scope = filter.scope;
    if (filter.published === true) where.published_at = { not: null };
    if (filter.published === false) where.published_at = null;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, data: IUpdateNotification) {
    try {
      return await this.prisma.notification.update({ where: { id }, data });
    } catch (e) {
      throw new RepositoryException('Erro ao atualizar notificação', e);
    }
  }

  async publish(id: string) {
    try {
      return await this.prisma.notification.update({
        where: { id },
        data: { published_at: new Date() },
      });
    } catch (e) {
      throw new RepositoryException('Erro ao publicar notificação', e);
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch (e) {
      throw new RepositoryException('Erro ao deletar notificação', e);
    }
  }

  async findActiveForTenant(tenantId: string) {
    return this.prisma.notification.findMany({
      where: {
        published_at: { not: null },
        OR: [{ scope: 'broadcast' }, { tenant_ids: { has: tenantId } }],
      },
      orderBy: { published_at: 'desc' },
    });
  }

  async findAllActiveTenantIds(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { active: true },
      select: { id: true },
    });
    return tenants.map(t => t.id);
  }
}
