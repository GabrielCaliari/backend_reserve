import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { UpsertMetricGoalDto } from '../dtos/metric-goal.dto';

/** Metas configuraveis por metrica (§3.8, Decisao #3). */
@Injectable()
export class MetricGoalService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tenantId: string, dto: UpsertMetricGoalDto) {
    try {
      const goal = await this.prisma.metricGoal.upsert({
        where: {
          tenant_id_metric_key_period: {
            tenant_id: tenantId,
            metric_key: dto.metric_key,
            period: dto.period,
          },
        },
        update: {
          target_value: dto.target_value,
          show_goal: dto.show_goal ?? undefined,
        },
        create: {
          tenant_id: tenantId,
          metric_key: dto.metric_key,
          period: dto.period,
          target_value: dto.target_value,
          show_goal: dto.show_goal ?? false,
        },
      });
      return successResponse(goal);
    } catch (error) {
      return errorResponse('500:METRIC_GOAL_NOT_SAVED', 500, error);
    }
  }

  async findByTenantId(tenantId: string) {
    try {
      const goals = await this.prisma.metricGoal.findMany({ where: { tenant_id: tenantId } });
      return successResponse(goals);
    } catch (error) {
      return errorResponse('500:METRIC_GOALS_NOT_LISTED', 500, error);
    }
  }

  async delete(tenantId: string, id: string) {
    try {
      const exists = await this.prisma.metricGoal.findFirst({ where: { id, tenant_id: tenantId } });
      if (!exists) return errorResponse('404:METRIC_GOAL_NOT_FOUND', 404);
      await this.prisma.metricGoal.delete({ where: { id } });
      return successResponse({ deleted: true });
    } catch (error) {
      return errorResponse('500:METRIC_GOAL_NOT_DELETED', 500, error);
    }
  }

  /**
   * Decisão #3: default é exibir meta apenas para leads de WhatsApp. Chamado
   * uma vez, a partir de HotelClientService.create(), para todo cliente com
   * tenant_id vinculado. Gracioso quando não há tenant ainda (não lança).
   */
  async seedDefaultGoal(tenantId: string): Promise<void> {
    await this.prisma.metricGoal.upsert({
      where: {
        tenant_id_metric_key_period: {
          tenant_id: tenantId,
          metric_key: 'whatsapp_leads',
          period: 'biweekly',
        },
      },
      update: {},
      create: {
        tenant_id: tenantId,
        metric_key: 'whatsapp_leads',
        period: 'biweekly',
        target_value: 0,
        show_goal: true,
      },
    });
  }
}
