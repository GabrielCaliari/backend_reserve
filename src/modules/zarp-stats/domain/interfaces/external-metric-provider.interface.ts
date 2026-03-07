import { DateRange, MetricGroup } from './metric-provider.interface';

export interface ConfigFieldSchema {
  type: 'string' | 'json' | 'boolean';
  required: boolean;
  description: string;
  secret?: boolean; // indicates the field contains sensitive data
}

export const EXTERNAL_METRIC_PROVIDERS = 'EXTERNAL_METRIC_PROVIDERS';

/**
 * Contract for external metric providers (e.g. Google Search Console).
 * Each implementation is stateless — config comes from StatsIntegration.config per tenant.
 * Register implementations as multi-providers in ZarpStatsModule.
 */
export interface IExternalMetricProvider {
  readonly integrationKey: string;
  readonly label: string;
  readonly description: string;
  readonly configSchema: Record<string, ConfigFieldSchema>;
  getMetrics(
    config: Record<string, any>,
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<MetricGroup>;
  validateConfig(config: Record<string, any>): boolean;
}
