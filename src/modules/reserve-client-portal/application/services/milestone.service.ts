import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { CreateMilestoneDto, UpdateMilestoneDto } from '../dtos/milestone.dto';

/** Linha do tempo / marcos (§3.10 + §3.11). */
@Injectable()
export class MilestoneService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateMilestoneDto) {
    try {
      const milestone = await this.prisma.milestone.create({
        data: { tenant_id: tenantId, date: new Date(dto.date), title: dto.title, type: dto.type },
      });
      return successResponse(milestone, 201);
    } catch (error) {
      return errorResponse('500:MILESTONE_NOT_CREATED', 500, error);
    }
  }

  async findByTenantId(tenantId: string) {
    try {
      const milestones = await this.prisma.milestone.findMany({
        where: { tenant_id: tenantId },
        orderBy: { date: 'asc' },
      });
      return successResponse(milestones);
    } catch (error) {
      return errorResponse('500:MILESTONES_NOT_LISTED', 500, error);
    }
  }

  async update(tenantId: string, id: string, dto: UpdateMilestoneDto) {
    try {
      const exists = await this.prisma.milestone.findFirst({ where: { id, tenant_id: tenantId } });
      if (!exists) return errorResponse('404:MILESTONE_NOT_FOUND', 404);
      const milestone = await this.prisma.milestone.update({
        where: { id },
        data: { date: new Date(dto.date), title: dto.title, type: dto.type },
      });
      return successResponse(milestone);
    } catch (error) {
      return errorResponse('500:MILESTONE_NOT_UPDATED', 500, error);
    }
  }

  async delete(tenantId: string, id: string) {
    try {
      const exists = await this.prisma.milestone.findFirst({ where: { id, tenant_id: tenantId } });
      if (!exists) return errorResponse('404:MILESTONE_NOT_FOUND', 404);
      await this.prisma.milestone.delete({ where: { id } });
      return successResponse({ deleted: true });
    } catch (error) {
      return errorResponse('500:MILESTONE_NOT_DELETED', 500, error);
    }
  }

  /**
   * Idempotent: two "marco zero" rows for one tenant would be a data bug, not
   * a valid state. No DB-level unique constraint (type isn't unique for the
   * other five values) — enforced at the application layer via findFirst +
   * create-if-absent, since this only ever runs from one call site
   * (HotelClientService.create).
   */
  async createMarcoZero(tenantId: string, contractStart: Date): Promise<void> {
    const existing = await this.prisma.milestone.findFirst({
      where: { tenant_id: tenantId, type: 'marco_zero' },
    });
    if (existing) return;

    await this.prisma.milestone.create({
      data: {
        tenant_id: tenantId,
        date: contractStart,
        title: 'Início da parceria com a Reserve',
        type: 'marco_zero',
      },
    });
  }
}
