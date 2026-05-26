export class SiteMetricEntity {
  id: string;
  client_id: string;
  metric_date: Date;
  organic_visitors: number;
  paid_visitors: number;
  direct_visitors: number;
  social_visitors: number;
  package_page_views: number;
  checkout_starts: number;
  checkout_completes: number;
  avg_time_on_package: number;
  bounce_rate: number;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<SiteMetricEntity>) {
    Object.assign(this, partial);
  }
}
