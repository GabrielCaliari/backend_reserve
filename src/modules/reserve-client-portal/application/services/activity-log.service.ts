import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';
import { EActivityLogCategory } from '../../domain/enums/activity-log-category.enum';

export interface IRecordActivityLog {
  type?: EActivityLogType;
  category: EActivityLogCategory;
  title: string;
  description?: string;
  icon?: string;
  createdBy?: string;
}

/**
 * §5.x client-facing activity feed. A plain injectable service method — not
 * an event-emitter/pub-sub bus, matching the codebase's existing
 * direct-service-call convention (introducing a bus for a handful of call
 * sites would be over-engineering relative to how NotificationEventService
 * .dispatch is already called directly today).
 */
@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(tenantId: string, input: IRecordActivityLog) {
    return this.prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        type: input.type ?? EActivityLogType.MANUAL,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? null,
        created_by: input.createdBy ?? null,
      },
    });
  }

  /** Admin-side feed for a tenant, newest-first, paginated. */
  async listByTenant(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { tenant_id: tenantId } }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Client-portal feed, resolving client_id → tenant_id internally. */
  async listByClient(clientId: string, page = 1, limit = 20) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });

    if (!client?.tenant_id) {
      throw new BadRequestException('Client has no linked tenant_id');
    }

    return this.listByTenant(client.tenant_id, page, limit);
  }
}
