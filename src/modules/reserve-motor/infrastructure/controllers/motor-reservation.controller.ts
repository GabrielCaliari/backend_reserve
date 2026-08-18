import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { AvailabilityQueryDto } from '../../application/dtos/availability.dto';
import {
  CancelDto,
  CreateManualReservationDto,
  ListReservationsQueryDto,
  RescheduleDto,
} from '../../application/dtos/reservation.dto';
import { AvailabilityService } from '../../application/services/availability.service';
import { ReservationService } from '../../application/services/reservation.service';

@Controller('motor/:tenantId')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get('availability')
  @RequirePermissions('motor.read')
  async availability(@Param('tenantId') tenantId: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.search(tenantId, query);
  }

  @Get('reservations')
  @RequirePermissions('motor.read')
  async list(@Param('tenantId') tenantId: string, @Query() query: ListReservationsQueryDto) {
    return this.reservationService.list(tenantId, query);
  }

  @Get('reservations/:id')
  @RequirePermissions('motor.read')
  async detail(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.reservationService.detail(tenantId, id);
  }

  @Post('reservations')
  @RequirePermissions('motor.reservations.manage')
  async createManual(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateManualReservationDto,
    @Req() req: any,
  ) {
    return this.reservationService.createManual(tenantId, dto, req.admin_id ?? 'admin');
  }

  @Post('reservations/:id/reschedule')
  @RequirePermissions('motor.reservations.manage')
  async reschedule(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
    @Req() req: any,
  ) {
    return this.reservationService.reschedule(tenantId, id, dto, req.admin_id ?? 'admin');
  }

  @Post('reservations/:id/cancel')
  @RequirePermissions('motor.reservations.manage')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelDto,
    @Req() req: any,
  ) {
    return this.reservationService.cancel(tenantId, id, dto, req.admin_id ?? 'admin');
  }
}
