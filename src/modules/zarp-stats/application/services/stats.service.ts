import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IMetricProvider,
  METRIC_PROVIDERS,
  DateRange,
  TimeSeriesGranularity,
  MetricScope,
} from '../../domain/interfaces/metric-provider.interface';
import {
  IExternalMetricProvider,
  EXTERNAL_METRIC_PROVIDERS,
} from '../../domain/interfaces/external-metric-provider.interface';
import {
  IStatsIntegrationRepository,
  STATS_INTEGRATION_REPOSITORY,
} from '../../domain/interfaces/stats-integration.repository.interface';
import { DashboardResponseDto, MetricGroupResponseDto, TimeSeriesGroupResponseDto, TimeSeriesResponseDto } from '../dtos/stats.dto';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../zarp-auth/domain/interfaces';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @Optional()
    @Inject(METRIC_PROVIDERS)
    private readonly metricProviders: IMetricProvider[],

    @Optional()
    @Inject(EXTERNAL_METRIC_PROVIDERS)
    private readonly externalProviders: IExternalMetricProvider[],

    @Inject(STATS_INTEGRATION_REPOSITORY)
    private readonly integrationRepository: IStatsIntegrationRepository,

    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
  ) {
    this.metricProviders = Array.isArray(metricProviders) ? metricProviders : metricProviders ? [metricProviders] : [];
    this.externalProviders = Array.isArray(externalProviders) ? externalProviders : externalProviders ? [externalProviders] : [];
  }

  async getDashboard(tenantId: string, dateRange?: DateRange): Promise<DashboardResponseDto> {
    await this.ensureTenantIsAccessible(tenantId);
    return this.buildDashboard({
      tenantId,
      dateRange,
      includeExternal: true,
      scope: 'tenant',
    });
  }

  async getGlobalDashboard(dateRange?: DateRange): Promise<DashboardResponseDto> {
    return this.buildDashboard({
      dateRange,
      includeExternal: false,
      scope: 'global',
    });
  }

  private async buildDashboard(options: {
    tenantId?: string;
    dateRange?: DateRange;
    includeExternal: boolean;
    scope: 'tenant' | 'global';
  }): Promise<DashboardResponseDto> {
    const { tenantId, dateRange, includeExternal, scope } = options;
    const groups: MetricGroupResponseDto[] = [];
    const providers = this.getScopedProviders(scope);

    // Collect from all internal providers in parallel (errors are isolated per provider)
    const internalResults = await Promise.allSettled(
      providers.map((provider) =>
        provider.getMetrics(tenantId, dateRange),
      ),
    );

    for (let i = 0; i < internalResults.length; i++) {
      const result = internalResults[i];
      const provider = providers[i];

      if (result.status === 'fulfilled') {
        groups.push(result.value);
      } else {
        this.logger.error(
          `Metric provider "${provider.moduleKey}" failed: ${result.reason?.message}`,
        );
        groups.push({
          moduleKey: provider.moduleKey,
          label: provider.label,
          metrics: [],
          fetchedAt: new Date(),
          error: `Failed to fetch metrics: ${result.reason?.message ?? 'Unknown error'}`,
        });
      }
    }

    if (!includeExternal || !tenantId) {
      return {
        groups,
        generatedAt: new Date(),
      };
    }

    // Collect from enabled external integrations for this tenant
    const integrations = await this.integrationRepository.findByTenant(tenantId);
    const activeIntegrations = integrations.filter((i) => i.active);

    const externalResults = await Promise.allSettled(
      activeIntegrations.map((integration) => {
        const provider = this.externalProviders.find(
          (p) => p.integrationKey === integration.key,
        );
        if (!provider) {
          return Promise.reject(
            new Error(`No provider registered for key "${integration.key}"`),
          );
        }
        return provider.getMetrics(integration.config, tenantId, dateRange);
      }),
    );

    for (let i = 0; i < externalResults.length; i++) {
      const result = externalResults[i];
      const integration = activeIntegrations[i];

      if (result.status === 'fulfilled') {
        groups.push(result.value);
      } else {
        this.logger.error(
          `External provider "${integration.key}" (tenant ${tenantId}) failed: ${result.reason?.message}`,
        );
        groups.push({
          moduleKey: integration.key,
          label: integration.label,
          metrics: [],
          fetchedAt: new Date(),
          error: `Failed to fetch external metrics: ${result.reason?.message ?? 'Unknown error'}`,
        });
      }
    }

    return {
      groups,
      generatedAt: new Date(),
    };
  }

  getAvailableExternalProviders() {
    return this.externalProviders.map((p) => ({
      key: p.integrationKey,
      label: p.label,
      description: p.description,
      configSchema: p.configSchema,
    }));
  }

  /**
   * Returns metrics from a single internal provider by moduleKey.
   */
  async getModuleMetrics(
    moduleKey: string,
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<MetricGroupResponseDto | null> {
    await this.ensureTenantIsAccessible(tenantId);

    const provider = this.getScopedProviders('tenant').find((p) => p.moduleKey === moduleKey);
    if (!provider) return null;

    try {
      return await provider.getMetrics(tenantId, dateRange);
    } catch (err) {
      this.logger.error(
        `Metric provider "${moduleKey}" failed: ${(err as Error).message}`,
      );
      return {
        moduleKey: provider.moduleKey,
        label: provider.label,
        metrics: [],
        fetchedAt: new Date(),
        error: `Failed to fetch metrics: ${(err as Error).message ?? 'Unknown error'}`,
      };
    }
  }

  /**
   * Returns time-series data from a single provider (or all providers that support it).
   */
  async getTimeSeries(
    tenantId: string,
    dateRange: DateRange,
    granularity: TimeSeriesGranularity,
    moduleKey?: string,
  ): Promise<TimeSeriesResponseDto> {
    await this.ensureTenantIsAccessible(tenantId);

    const scopedProviders = this.getScopedProviders('tenant');
    const providers = moduleKey
      ? scopedProviders.filter((p) => p.moduleKey === moduleKey && p.getTimeSeries)
      : scopedProviders.filter((p) => p.getTimeSeries);

    const results = await Promise.allSettled(
      providers.map((p) => p.getTimeSeries!(tenantId, dateRange, granularity)),
    );

    const allSeries: TimeSeriesGroupResponseDto[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        allSeries.push(...result.value);
      } else {
        this.logger.error(
          `TimeSeries provider "${providers[i].moduleKey}" failed: ${result.reason?.message}`,
        );
      }
    }

    return {
      series: allSeries,
      generatedAt: new Date(),
    };
  }

  /**
   * Returns the list of internal module keys currently registered.
   */
  getAvailableModuleKeys(): string[] {
    return this.metricProviders.map((p) => p.moduleKey);
  }

  private getScopedProviders(scope: 'tenant' | 'global'): IMetricProvider[] {
    return this.metricProviders.filter((provider) => {
      const providerScope: MetricScope = provider.scope ?? 'both';

      if (scope === 'tenant') {
        return providerScope !== 'global';
      }

      return true;
    });
  }

  private async ensureTenantIsAccessible(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.selectById(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    if (tenant.active === false) {
      throw new ForbiddenException(`Tenant ${tenantId} is inactive`);
    }
  }
}
