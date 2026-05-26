import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { DashboardService } from '../../application/services/dashboard.service';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

/**
 * Client Portal Controller
 * Routes: /hotel-portal/...
 * Used by admin users to view hotel marketing dashboards.
 */
@Controller('hotel-portal')
@UseGuards(AdminJwtGuard)
export class ClientPortalController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly hotelClientService: HotelClientService,
  ) {}

  @Get('my-clients')
  async getMyClients(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.findByAdminId(admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/dashboard')
  async getDashboard(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.dashboardService.getFullDashboard(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/snapshots')
  async getSnapshots(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.dashboardService.getSnapshotSummary(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/campaigns')
  async getCampaigns(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.dashboardService.getCampaignMetrics(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/site-metrics')
  async getSiteMetrics(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.dashboardService.getSiteMetrics(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  private defaultFrom(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
}
