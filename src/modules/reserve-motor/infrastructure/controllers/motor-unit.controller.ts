import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CreateUnitDto, UpdateUnitDto } from '../../application/dtos/room-type.dto';
import { UnitService } from '../../application/services/unit.service';

@Controller('motor/:tenantId/units')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorUnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @RequirePermissions('motor.read')
  async list(@Param('tenantId') tenantId: string, @Query('room_type_id') roomTypeId?: string) {
    return this.unitService.list(tenantId, roomTypeId);
  }

  @Post()
  @RequirePermissions('motor.settings.manage')
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions('motor.settings.manage')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitService.update(tenantId, id, dto);
  }
}
