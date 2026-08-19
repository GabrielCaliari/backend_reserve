import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { BulkDailyInventoryDto, UpsertDailyInventoryDto } from '../../application/dtos/daily-inventory.dto';
import { DailyInventoryService } from '../../application/services/daily-inventory.service';

@Controller('motor/:tenantId/daily-inventory')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorDailyInventoryController {
  constructor(private readonly dailyInventoryService: DailyInventoryService) {}

  @Get()
  @RequirePermissions('motor.read')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('room_type_id') roomTypeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.dailyInventoryService.listRange(tenantId, roomTypeId, from, to);
  }

  @Put()
  @RequirePermissions('motor.settings.manage')
  async upsert(@Param('tenantId') tenantId: string, @Body() dto: UpsertDailyInventoryDto) {
    return this.dailyInventoryService.upsertOverride(tenantId, dto);
  }

  @Post('bulk')
  @RequirePermissions('motor.settings.manage')
  async bulk(@Param('tenantId') tenantId: string, @Body() dto: BulkDailyInventoryDto) {
    return this.dailyInventoryService.bulkOverride(tenantId, dto);
  }

  @Post('materialize')
  @RequirePermissions('motor.settings.manage')
  async materialize(@Param('tenantId') tenantId: string) {
    const rows = await this.dailyInventoryService.materializeTenant(tenantId);
    return { rows };
  }
}
