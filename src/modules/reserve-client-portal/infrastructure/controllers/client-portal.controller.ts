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
import { DashboardService } from '../../application/services/dashboard.service';
import { OverviewService } from '../../application/services/overview.service';
import { LeadsOverviewService } from '../../application/services/leads-overview.service';
import { BotChannelHealthService } from '../../application/services/bot-channel-health.service';
import { BotConversationService } from '../../application/services/bot-conversation.service';
import { ListConversationsQueryDto } from '../../application/dtos/list-conversations-query.dto';
import { FunnelMetricsService } from '../../application/services/funnel-metrics.service';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { RoiAnalysisService } from '../../application/services/roi-analysis.service';
import { SemesterPlanService } from '../../application/services/semester-plan.service';
import { BotConfigProposalService } from '../../application/services/bot-config-proposal.service';
import { CreateBotConfigProposalDto } from '../../application/dtos/bot-config-proposal.dto';
import { InstagramOverviewService } from '../../application/services/instagram-overview.service';
import { ContentPostService } from '../../application/services/content-post.service';
import { ActivityLogService } from '../../application/services/activity-log.service';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

/**
 * Client Portal Controller
 * Routes: /hotel-portal/...
 * Used by admin users to view hotel marketing dashboards.
 *
 * Estas rotas sao chamadas pelo dashboard SEM `x-skip-tenant`, ou seja, sempre
 * com `x-tenant-id` — e o que permite o TenantGuard resolver request.tenant_id
 * aqui (as rotas sao chaveadas por `:clientId`, id de HotelClient, nao por
 * tenant) e o ModuleAccessGuard gatear o modulo client-portal de verdade.
 */
@Controller('hotel-portal')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard)
@RequiresModule('client-portal')
export class ClientPortalController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly overviewService: OverviewService,
    private readonly leadsOverviewService: LeadsOverviewService,
    private readonly botChannelHealthService: BotChannelHealthService,
    private readonly botConversationService: BotConversationService,
    private readonly funnelMetricsService: FunnelMetricsService,
    private readonly hotelClientService: HotelClientService,
    private readonly roiAnalysisService: RoiAnalysisService,
    private readonly semesterPlanService: SemesterPlanService,
    private readonly botConfigProposalService: BotConfigProposalService,
    private readonly instagramOverviewService: InstagramOverviewService,
    private readonly contentPostService: ContentPostService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get(':clientId/overview')
  async getOverview(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.overviewService.getOverview(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/leads-overview')
  async getLeadsOverview(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    return this.leadsOverviewService.getOverview(clientId, fromDate, toDate);
  }

  @Get(':clientId/roi')
  async getRoi(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    const result = await this.roiAnalysisService.getRoi(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/semester-plan')
  async getSemesterPlan(@Param('clientId') clientId: string, @Res() res: Response) {
    const result = await this.semesterPlanService.findByClientId(clientId);
    return res.status(result.status).json(result.data);
  }

  @Post(':clientId/bot-config-proposals')
  async submitBotConfigProposal(
    @Param('clientId') clientId: string,
    @Body() dto: CreateBotConfigProposalDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.botConfigProposalService.submitByClientId(clientId, admin.admin_id, dto);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/bot-config-proposals')
  async getBotConfigProposals(@Param('clientId') clientId: string, @Res() res: Response) {
    const result = await this.botConfigProposalService.findByClientId(clientId);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/whatsapp/channels')
  async getWhatsAppChannels(@Param('clientId') clientId: string) {
    return this.botChannelHealthService.getChannels(clientId);
  }

  @Get(':clientId/whatsapp/conversations')
  async listWhatsAppConversations(
    @Param('clientId') clientId: string,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.botConversationService.list(clientId, query);
  }

  @Get(':clientId/whatsapp/conversations/:numeroContato')
  async getWhatsAppConversationDetail(
    @Param('clientId') clientId: string,
    @Param('numeroContato') numeroContato: string,
  ) {
    return this.botConversationService.detail(clientId, numeroContato);
  }

  @Get(':clientId/whatsapp/funnel')
  async getWhatsAppFunnelBoard(@Param('clientId') clientId: string) {
    return this.funnelMetricsService.getBoard(clientId);
  }

  @Get(':clientId/whatsapp/funnel/metrics')
  async getWhatsAppFunnelMetrics(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    return this.funnelMetricsService.getMetrics(clientId, fromDate, toDate);
  }

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

  @Get(':clientId/instagram')
  async getInstagramOverview(
    @Param('clientId') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : this.defaultFrom();
    const toDate = to ? new Date(to) : new Date();
    return this.instagramOverviewService.getOverview(clientId, fromDate, toDate);
  }

  @Get(':clientId/content-posts')
  async getContentPosts(
    @Param('clientId') clientId: string,
    @Query('month') month: string,
  ) {
    return this.contentPostService.getCalendar(clientId, month);
  }

  @Get(':clientId/activities')
  async getActivities(
    @Param('clientId') clientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.activityLogService.listByClient(clientId, Number(page), Number(limit));
  }

  private defaultFrom(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
}
