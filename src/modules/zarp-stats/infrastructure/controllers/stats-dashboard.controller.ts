import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { StatsService } from '../../application/services/stats.service';
import {
  DateRangeQueryDto,
  DashboardResponseDto,
  MetricGroupResponseDto,
  TimeSeriesQueryDto,
  TimeSeriesResponseDto,
} from '../../application/dtos/stats.dto';
import { AvailableIntegrationDto } from '../../application/dtos/stats-integration.dto';
import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../zarp-auth/domain/enums/admin-role.enum';
import { DateRange } from '../../domain/interfaces/metric-provider.interface';
import { ParseCuidPipe } from '../../../../shared/pipes/parse-cuid.pipe';

@ApiTags('Stats - Dashboard')
@ApiBearerAuth()
@Controller()
export class StatsDashboardController {
  constructor(private readonly statsService: StatsService) {}

  @Get('/dashboard')
  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
  @Roles(EAdminRole.viewer)
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
  @ApiOperation({
    summary: 'Get stats dashboard',
    description:
      'Returns aggregated metrics from all internal module providers and enabled external integrations for the current tenant.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics', type: DashboardResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No access to this tenant' })
  async getDashboard(
    @Req() req: any,
    @Query() query: DateRangeQueryDto,
  ): Promise<DashboardResponseDto> {
    const tenantId: string = req.tenant_id;

    let dateRange: DateRange | undefined;
    if (query.from || query.to) {
      dateRange = {
        from: query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: query.to ? new Date(query.to) : new Date(),
      };
    }

    return this.statsService.getDashboard(tenantId, dateRange);
  }

  @Get('/dashboard/tenants/:tenantId')
  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'Get stats dashboard for a tenant',
    description:
      'Returns aggregated tenant-scoped metrics for the tenant identified in the route param. ' +
      'Regular admins must belong to the tenant. Super admins can inspect any active tenant.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant CUID',
    example: 'cktenant1234567890abcdefgh',
  })
  @ApiResponse({ status: 200, description: 'Tenant dashboard metrics', type: DashboardResponseDto })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getDashboardByTenant(
    @Param('tenantId', ParseCuidPipe) tenantId: string,
    @Query() query: DateRangeQueryDto,
  ): Promise<DashboardResponseDto> {
    const dateRange = this.buildDateRange(query);
    return this.statsService.getDashboard(tenantId, dateRange);
  }

  @Get('/dashboard/global')
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(EAdminRole.super_admin)
  @ApiOperation({
    summary: 'Get aggregated dashboard across all tenants',
    description:
      'Returns aggregated internal metrics across all active tenants. ' +
      'This route is restricted to super admins and does not require x-tenant-id.',
  })
  @ApiResponse({ status: 200, description: 'Global aggregated dashboard metrics', type: DashboardResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - super admin only' })
  async getGlobalDashboard(
    @Query() query: DateRangeQueryDto,
  ): Promise<DashboardResponseDto> {
    const dateRange = this.buildDateRange(query);
    return this.statsService.getGlobalDashboard(dateRange);
  }

  @Get('/available-integrations')
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(EAdminRole.viewer)
  @ApiOperation({
    summary: 'List available external integrations',
    description: 'Returns all registered external metric providers with their config schemas.',
  })
  @ApiResponse({ status: 200, description: 'Available integrations', type: [AvailableIntegrationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listAvailableIntegrations(): AvailableIntegrationDto[] {
    return this.statsService.getAvailableExternalProviders();
  }

  @Get('/module/:moduleKey')
  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
  @Roles(EAdminRole.viewer)
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
  @ApiOperation({
    summary: 'Get metrics for a single module',
    description:
      'Returns the metric group from a specific internal provider, identified by its moduleKey.',
  })
  @ApiParam({
    name: 'moduleKey',
    description: 'Internal module key (e.g. leads, cms, users, storage)',
    example: 'leads',
  })
  @ApiResponse({ status: 200, description: 'Module metrics', type: MetricGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async getModuleMetrics(
    @Req() req: any,
    @Param('moduleKey') moduleKey: string,
    @Query() query: DateRangeQueryDto,
  ): Promise<MetricGroupResponseDto> {
    const tenantId: string = req.tenant_id;

    const dateRange = this.buildDateRange(query);

    const result = await this.statsService.getModuleMetrics(moduleKey, tenantId, dateRange);
    if (!result) {
      throw new NotFoundException(
        `Module "${moduleKey}" not found. Available: ${this.statsService.getAvailableModuleKeys().join(', ')}`,
      );
    }
    return result;
  }

  @Get('/timeseries')
  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
  @Roles(EAdminRole.viewer)
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
  @ApiOperation({
    summary: 'Get time-series data',
    description:
      'Returns time-series data points grouped by the specified granularity. ' +
      'Optionally filter by a single moduleKey via the "module" query param.',
  })
  @ApiResponse({ status: 200, description: 'Time series data', type: TimeSeriesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeSeries(
    @Req() req: any,
    @Query() query: TimeSeriesQueryDto,
    @Query('module') moduleKey?: string,
  ): Promise<TimeSeriesResponseDto> {
    const tenantId: string = req.tenant_id;
    const granularity = query.granularity ?? 'day';

    const dateRange: DateRange = {
      from: query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: query.to ? new Date(query.to) : new Date(),
    };

    return this.statsService.getTimeSeries(tenantId, dateRange, granularity, moduleKey);
  }

  private buildDateRange(query: DateRangeQueryDto): DateRange | undefined {
    if (!query.from && !query.to) {
      return undefined;
    }

    return {
      from: query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: query.to ? new Date(query.to) : new Date(),
    };
  }
}
