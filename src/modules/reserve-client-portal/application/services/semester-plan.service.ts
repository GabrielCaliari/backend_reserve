import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { ActivityLogService } from './activity-log.service';
import {
  CreateSemesterPlanDto,
  CreateSemesterPlanDeliveryDto,
  UpdateSemesterPlanDeliveryDto,
} from '../dtos/semester-plan.dto';

/** Plano semestral e entregas (§3.11). */
@Injectable()
export class SemesterPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async createPlan(tenantId: string, adminId: string, dto: CreateSemesterPlanDto) {
    try {
      const plan = await this.prisma.semesterPlan.create({
        data: {
          tenant_id: tenantId,
          semestre: dto.semestre,
          titulo: dto.titulo,
          eixos: dto.eixos ?? [],
          criado_por: adminId,
        },
      });
      return successResponse(plan, 201);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLAN_NOT_CREATED', 500, error);
    }
  }

  /** Client-portal read: resolves clientId -> tenant_id before querying (Global Constraints pattern). */
  async findByClientId(clientId: string) {
    try {
      const client = await this.prisma.hotelClient.findUnique({
        where: { id: clientId },
        select: { tenant_id: true },
      });
      if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      if (!client.tenant_id) return errorResponse('400:HOTEL_CLIENT_WITHOUT_TENANT', 400);
      return this.findByTenantId(client.tenant_id);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLANS_NOT_LISTED', 500, error);
    }
  }

  async findByTenantId(tenantId: string) {
    try {
      const plans = await this.prisma.semesterPlan.findMany({
        where: { tenant_id: tenantId },
        orderBy: { semestre: 'desc' },
        include: { Deliveries: { orderBy: [{ mes: 'asc' }, { ordem: 'asc' }] } },
      });
      return successResponse(plans);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLANS_NOT_LISTED', 500, error);
    }
  }

  async findById(tenantId: string, planId: string) {
    try {
      const plan = await this.prisma.semesterPlan.findFirst({
        where: { id: planId, tenant_id: tenantId },
        include: { Deliveries: { orderBy: [{ mes: 'asc' }, { ordem: 'asc' }] } },
      });
      if (!plan) return errorResponse('404:SEMESTER_PLAN_NOT_FOUND', 404);
      return successResponse(plan);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLAN_NOT_FOUND', 500, error);
    }
  }

  async addDelivery(tenantId: string, planId: string, dto: CreateSemesterPlanDeliveryDto) {
    try {
      const plan = await this.prisma.semesterPlan.findFirst({
        where: { id: planId, tenant_id: tenantId },
      });
      if (!plan) return errorResponse('404:SEMESTER_PLAN_NOT_FOUND', 404);

      const delivery = await this.prisma.semesterPlanDelivery.create({
        data: {
          plano_id: planId,
          mes: dto.mes,
          titulo: dto.titulo,
          descricao: dto.descricao ?? null,
          ordem: dto.ordem ?? 0,
          milestone_id: dto.milestone_id ?? null,
        },
      });
      return successResponse(delivery, 201);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLAN_DELIVERY_NOT_CREATED', 500, error);
    }
  }

  /**
   * §3.11: "quando uma entrega conclui, gera evento no feed de atividades e,
   * se relevante, um marco" — "se relevante" is a human judgment call, so
   * this never auto-creates a Milestone. It accepts milestone_id on the same
   * PATCH so an admin can link an already-created Milestone in one action.
   */
  async updateDelivery(tenantId: string, deliveryId: string, dto: UpdateSemesterPlanDeliveryDto) {
    try {
      const delivery = await this.prisma.semesterPlanDelivery.findUnique({
        where: { id: deliveryId },
        include: { Plan: true },
      });
      if (!delivery || delivery.Plan.tenant_id !== tenantId) {
        return errorResponse('404:SEMESTER_PLAN_DELIVERY_NOT_FOUND', 404);
      }

      const becomingConcluido = dto.status === 'concluido' && delivery.status !== 'concluido';

      const updated = await this.prisma.semesterPlanDelivery.update({
        where: { id: deliveryId },
        data: {
          titulo: dto.titulo,
          descricao: dto.descricao,
          status: dto.status,
          ordem: dto.ordem,
          milestone_id: dto.milestone_id,
        },
      });

      if (becomingConcluido) {
        await this.activityLogService.record(tenantId, {
          type: 'manual',
          category: 'other',
          title: `Entrega concluída: ${updated.titulo}`,
        });
      }

      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:SEMESTER_PLAN_DELIVERY_NOT_UPDATED', 500, error);
    }
  }
}
