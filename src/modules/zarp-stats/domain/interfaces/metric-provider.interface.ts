export interface MetricValue {
  key: string;
  label: string;
  value: number | string;
  unit?: string; // 'count', 'bytes', '%', 'ms', etc.
  trend?: number; // percentage change vs previous period
  metadata?: Record<string, any>;
}

export interface MetricGroup {
  moduleKey: string;
  label: string;
  description?: string;
  metrics: MetricValue[];
  fetchedAt: Date;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export const METRIC_PROVIDERS = 'METRIC_PROVIDERS';

/**
 * Contract for internal module metric providers.
 * Any module that wants to expose metrics to the stats dashboard
 * implements this interface and registers itself in ZarpStatsModule.
 */
export interface IMetricProvider {
  readonly moduleKey: string;
  readonly label: string;
  getMetrics(tenantId?: string, dateRange?: DateRange): Promise<MetricGroup>;
}
