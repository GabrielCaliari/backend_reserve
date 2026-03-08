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
  error?: string;
}

export type TimeSeriesGranularity = 'day' | 'week' | 'month';

export interface TimeSeriesPoint {
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  value: number;
}

export interface TimeSeriesGroup {
  moduleKey: string;
  label: string;
  metricKey: string;
  metricLabel: string;
  granularity: TimeSeriesGranularity;
  series: TimeSeriesPoint[];
  from: Date;
  to: Date;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type MetricScope = 'tenant' | 'global' | 'both';

export const METRIC_PROVIDERS = 'METRIC_PROVIDERS';

/**
 * Contract for internal module metric providers.
 * Any module that wants to expose metrics to the stats dashboard
 * implements this interface and registers itself in ZarpStatsModule.
 *
 * `getTimeSeries` is optional. Providers that implement it will be
 * available under GET /api/stats/timeseries?module=<moduleKey>.
 */
export interface IMetricProvider {
  readonly moduleKey: string;
  readonly label: string;
  readonly scope?: MetricScope;
  getMetrics(tenantId?: string, dateRange?: DateRange): Promise<MetricGroup>;
  getTimeSeries?(
    tenantId: string,
    dateRange: DateRange,
    granularity: TimeSeriesGranularity,
  ): Promise<TimeSeriesGroup[]>;
}
