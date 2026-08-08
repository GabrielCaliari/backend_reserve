import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SemesterPlanService } from '../../application/services/semester-plan.service';
import {
  CreateSemesterPlanDto,
  CreateSemesterPlanDeliveryDto,
  UpdateSemesterPlanDeliveryDto,
} from '../../application/dtos/semester-plan.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

@Controller('admin/hotel-portal/:tenantId/semester-plan')
// O tenant vem do proprio caminho (`:tenantId`), entao o TenantGuard o resolve
// sem depender de header, valida que o admin pertence a ele e publica
// request.tenant_id - pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.semester-plan.manage')
export class AdminSemesterPlanController {
  constructor(private readonly semesterPlanService: SemesterPlanService) {}

  @Post()
  async createPlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateSemesterPlanDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.semesterPlanService.createPlan(tenantId, admin.admin_id, dto);
    return res.status(result.status).json(result.data);
  }

  @Get()
  async findByTenantId(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const result = await this.semesterPlanService.findByTenantId(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Get(':planId')
  async findById(
    @Param('tenantId') tenantId: string,
    @Param('planId') planId: string,
    @Res() res: Response,
  ) {
    const result = await this.semesterPlanService.findById(tenantId, planId);
    return res.status(result.status).json(result.data);
  }

  @Post(':planId/deliveries')
  async addDelivery(
    @Param('tenantId') tenantId: string,
    @Param('planId') planId: string,
    @Body() dto: CreateSemesterPlanDeliveryDto,
    @Res() res: Response,
  ) {
    const result = await this.semesterPlanService.addDelivery(tenantId, planId, dto);
    return res.status(result.status).json(result.data);
  }

  @Patch('deliveries/:deliveryId')
  async updateDelivery(
    @Param('tenantId') tenantId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: UpdateSemesterPlanDeliveryDto,
    @Res() res: Response,
  ) {
    const result = await this.semesterPlanService.updateDelivery(tenantId, deliveryId, dto);
    return res.status(result.status).json(result.data);
  }
}
