import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IMetricProvider,
  METRIC_PROVIDERS,
  DateRange,
  MetricGroup,
} from '../../domain/interfaces/metric-provider.interface';
import {
  IExternalMetricProvider,
  EXTERNAL_METRIC_PROVIDERS,
} from '../../domain/interfaces/external-metric-provider.interface';
import {
  IStatsIntegrationRepository,
  STATS_INTEGRATION_REPOSITORY,
} from '../../domain/interfaces/stats-integration.repository.interface';
import { DashboardResponseDto, MetricGroupResponseDto } from '../dtos/stats.dto';

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
    this.metricProviders = metricProviders ?? [];
    this.externalProviders = externalProviders ?? [];
  }

  async getDashboard(tenantId: number, dateRange?: DateRange): Promise<DashboardResponseDto> {
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
}
