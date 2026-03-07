import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { StatsService } from '../../application/services/stats.service';
import { DateRangeQueryDto, DashboardResponseDto } from '../../application/dtos/stats.dto';
import { AvailableIntegrationDto } from '../../application/dtos/stats-integration.dto';
import { AdminJwtGuard, TenantGuard } from '@/shared/auth/guards';
import { DateRange } from '../../domain/interfaces/metric-provider.interface';

@ApiTags('Stats - Dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard)
@Controller()
export class StatsDashboardController {
  constructor(private readonly statsService: StatsService) {}

  @Get('/dashboard')
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

  @Get('/available-integrations')
  @ApiOperation({
    summary: 'List available external integrations',
    description: 'Returns all registered external metric providers with their config schemas.',
  })
  @ApiResponse({ status: 200, description: 'Available integrations', type: [AvailableIntegrationDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listAvailableIntegrations(): AvailableIntegrationDto[] {
    return this.statsService.getAvailableExternalProviders();
  }
}
