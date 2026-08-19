import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CalendarService } from '../../application/services/calendar.service';
import { RateGridService } from '../../application/services/rate-grid.service';

@Controller('motor/:tenantId/calendar')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorCalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly rateGridService: RateGridService,
  ) {}

  @Get('range')
  @RequirePermissions('motor.read')
  range(
    @Param('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.calendarService.range(tenantId, from, to);
  }

  @Get('grade')
  @RequirePermissions('motor.read')
  grade(
    @Param('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.rateGridService.grade(tenantId, from, to);
  }

  @Get()
  @RequirePermissions('motor.read')
  async month(@Param('tenantId') tenantId: string, @Query('mes') mes: string) {
    return this.calendarService.month(tenantId, mes);
  }
}
