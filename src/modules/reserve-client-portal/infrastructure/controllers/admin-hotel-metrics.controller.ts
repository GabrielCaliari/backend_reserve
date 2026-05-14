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
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ReputationService } from '../../application/services/reputation.service';
import { HotelKpiService } from '../../application/services/hotel-kpi.service';
import { BookingWindowService } from '../../application/services/booking-window.service';
import { RateParityService } from '../../application/services/rate-parity.service';
import { MarketingBudgetService } from '../../application/services/marketing-budget.service';
import { InsertReputationDto } from '../../application/dtos/insert-reputation.dto';
import { InsertMonthlyKpiDto } from '../../application/dtos/insert-monthly-kpi.dto';
import { InsertBookingWindowDto } from '../../application/dtos/insert-booking-window.dto';
import { InsertRateParityDto } from '../../application/dtos/insert-rate-parity.dto';
import { InsertMarketingBudgetDto } from '../../application/dtos/insert-marketing-budget.dto';

@Controller('admin/hotel-portal/metrics')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.metrics.manage')
export class AdminHotelMetricsController {
  constructor(
    private readonly reputationService: ReputationService,
    private readonly hotelKpiService: HotelKpiService,
    private readonly bookingWindowService: BookingWindowService,
    private readonly rateParityService: RateParityService,
    private readonly marketingBudgetService: MarketingBudgetService,
  ) {}

  // ── Reputation ──────────────────────────────────────────────────────────────

  @Post(':clientId/reputation')
  async upsertReputation(
    @Param('clientId') clientId: string,
    @Body() dto: InsertReputationDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.reputationService.upsert(clientId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/reputation')
  async getReputation(
    @Param('clientId') clientId: string,
    @Query('months') months: string,
    @Res() res: Response,
  ) {
    const result = await this.reputationService.findByClientId(clientId, +months || 6);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/reputation/summary')
  async getReputationSummary(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.reputationService.getSummary(clientId);
    return res.status(result.status).json(result.data);
  }

  // ── KPI ─────────────────────────────────────────────────────────────────────

  @Post(':clientId/kpi')
  async upsertKpi(
    @Param('clientId') clientId: string,
    @Body() dto: InsertMonthlyKpiDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.hotelKpiService.upsert(clientId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/kpi')
  async getKpi(
    @Param('clientId') clientId: string,
    @Query('months') months: string,
    @Res() res: Response,
  ) {
    const result = await this.hotelKpiService.findByClientId(clientId, +months || 6);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/kpi/summary')
  async getKpiSummary(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.hotelKpiService.getSummary(clientId);
    return res.status(result.status).json(result.data);
  }

  // ── Booking Window ───────────────────────────────────────────────────────────

  @Post(':clientId/booking-window')
  async upsertBookingWindow(
    @Param('clientId') clientId: string,
    @Body() dto: InsertBookingWindowDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.bookingWindowService.upsert(clientId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/booking-window')
  async getBookingWindow(
    @Param('clientId') clientId: string,
    @Query('months') months: string,
    @Res() res: Response,
  ) {
    const result = await this.bookingWindowService.findByClientId(clientId, +months || 6);
    return res.status(result.status).json(result.data);
  }

  // ── Rate Parity ──────────────────────────────────────────────────────────────

  @Post(':clientId/rate-parity')
  async createRateParity(
    @Param('clientId') clientId: string,
    @Body() dto: InsertRateParityDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.rateParityService.create(clientId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/rate-parity')
  async getRateParity(
    @Param('clientId') clientId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.rateParityService.findByClientId(clientId, +page || 1, +limit || 20);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/rate-parity/violations')
  async getRateParityViolations(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.rateParityService.getViolations(clientId);
    return res.status(result.status).json(result.data);
  }

  // ── Marketing Budget ─────────────────────────────────────────────────────────

  @Post(':clientId/budget')
  async upsertBudget(
    @Param('clientId') clientId: string,
    @Body() dto: InsertMarketingBudgetDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.marketingBudgetService.upsert(clientId, dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/budget')
  async getBudget(
    @Param('clientId') clientId: string,
    @Query('months') months: string,
    @Res() res: Response,
  ) {
    const result = await this.marketingBudgetService.findByClientId(clientId, +months || 6);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/budget/comparison')
  async getBudgetComparison(
    @Param('clientId') clientId: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const result = await this.marketingBudgetService.getComparison(clientId, month);
    return res.status(result.status).json(result.data);
  }
}
