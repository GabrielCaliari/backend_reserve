import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';

export type ActivityLogType = 'auto' | 'manual';
export type ActivityLogCategory = 'post' | 'campaign' | 'report' | 'bot' | 'meeting' | 'other';

export interface RecordActivityInput {
  type: ActivityLogType;
  category: ActivityLogCategory;
  title: string;
  description?: string;
  icon?: string;
  createdBy?: string;
}

/**
 * `ActivityLog` (linha do tempo de atividades, §3.10/Fase 4 Task 7). A plain
 * injectable method, not an event-emitter/pub-sub bus — matches the
 * codebase's existing direct-service-call convention (NotificationEventService
 * is also called directly from call sites, not via emitted events).
 *
 * NOTE (integration): this model is officially Fase 4 Task 7's deliverable.
 * Declared here (see schema.prisma's Fase 5 shim block) because three Fase 5
 * tasks (digest publish, semester-plan delivery, bot-config approval) need to
 * write to the activity feed. De-duplicate with Fase 4's version once merged.
 */
@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(tenantId: string, input: RecordActivityInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        type: input.type,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? null,
        created_by: input.createdBy ?? null,
      },
    });
  }

  async findByTenantId(tenantId: string, page = 1, limit = 20) {
    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.activityLog.findMany({
          where: { tenant_id: tenantId },
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.activityLog.count({ where: { tenant_id: tenantId } }),
      ]);
      return successResponse({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return errorResponse('500:ACTIVITIES_NOT_LISTED', 500, error);
    }
  }
}
