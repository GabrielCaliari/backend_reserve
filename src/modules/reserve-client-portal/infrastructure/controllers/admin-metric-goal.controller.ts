import { Body, Controller, Delete, Get, Param, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MetricGoalService } from '../../application/services/metric-goal.service';
import { UpsertMetricGoalDto } from '../../application/dtos/metric-goal.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';

@Controller('admin/hotel-portal/:tenantId/goals')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.goals.manage')
export class AdminMetricGoalController {
  constructor(private readonly metricGoalService: MetricGoalService) {}

  @Put()
  async upsert(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpsertMetricGoalDto,
    @Res() res: Response,
  ) {
    const result = await this.metricGoalService.upsert(tenantId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get()
  async findByTenantId(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const result = await this.metricGoalService.findByTenantId(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.metricGoalService.delete(tenantId, id);
    return res.status(result.status).json(result.data);
  }
}
