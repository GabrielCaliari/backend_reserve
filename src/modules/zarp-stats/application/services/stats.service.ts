import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IMetricProvider,
  METRIC_PROVIDERS,
  DateRange,
  MetricGroup,
  TimeSeriesGranularity,
  TimeSeriesGroup,
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
  ) {
    this.metricProviders = Array.isArray(metricProviders) ? metricProviders : metricProviders ? [metricProviders] : [];
    this.externalProviders = Array.isArray(externalProviders) ? externalProviders : externalProviders ? [externalProviders] : [];
  }

  async getDashboard(tenantId: string, dateRange?: DateRange): Promise<DashboardResponseDto> {
    const groups: MetricGroupResponseDto[] = [];

    // Collect from all internal providers in parallel (errors are isolated per provider)
    const internalResults = await Promise.allSettled(
      this.metricProviders.map((provider) =>
        provider.getMetrics(tenantId, dateRange),
      ),
    );

    for (let i = 0; i < internalResults.length; i++) {
      const result = internalResults[i];
      const provider = this.metricProviders[i];

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
    const provider = this.metricProviders.find((p) => p.moduleKey === moduleKey);
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
    const providers = moduleKey
      ? this.metricProviders.filter((p) => p.moduleKey === moduleKey && p.getTimeSeries)
      : this.metricProviders.filter((p) => p.getTimeSeries);

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
}
