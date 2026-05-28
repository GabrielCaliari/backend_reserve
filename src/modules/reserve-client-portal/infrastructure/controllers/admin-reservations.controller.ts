import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReservationService } from '../../application/services/reservation.service';
import { CreateReservationDto } from '../../application/dtos/reservation.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { EReservationSource, EReservationStatus } from '../../domain/enums/reservation.enum';

@Controller('admin/hotel-portal/reservations')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
export class AdminReservationsController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post(':tenantId')
  async createManual(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateReservationDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.reservationService.createManual(tenantId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':tenantId')
  async findByTenantId(
    @Param('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('source') source?: EReservationSource,
    @Query('status') status?: EReservationStatus,
    @Res() res?: Response,
  ) {
    const result = await this.reservationService.findByTenantId(
      tenantId,
      Number(page),
      Number(limit),
      source,
      status,
    );
    return res.status(result.status).json(result.data);
  }

  @Get(':tenantId/stats')
  async getStats(
    @Param('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    const result = await this.reservationService.getStats(tenantId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }
}
