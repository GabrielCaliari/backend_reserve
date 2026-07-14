import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MilestoneService } from '../../application/services/milestone.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from '../../application/dtos/milestone.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';

@Controller('admin/hotel-portal/:tenantId/milestones')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.milestones.manage')
export class AdminMilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateMilestoneDto,
    @Res() res: Response,
  ) {
    const result = await this.milestoneService.create(tenantId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get()
  async findByTenantId(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const result = await this.milestoneService.findByTenantId(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Put(':id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @Res() res: Response,
  ) {
    const result = await this.milestoneService.update(tenantId, id, dto);
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  async delete(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.milestoneService.delete(tenantId, id);
    return res.status(result.status).json(result.data);
  }
}
