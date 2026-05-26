import { DashboardSnapshotEntity } from '../entities/dashboard-snapshot.entity';
import { CampaignMetricEntity } from '../entities/campaign-metric.entity';
import { SiteMetricEntity } from '../entities/site-metric.entity';
import { ECampaignChannel } from '../enums/campaign-channel.enum';

export const DASHBOARD_REPOSITORY = 'DASHBOARD_REPOSITORY';

export interface IUpsertDashboardSnapshot {
  client_id: string;
  snapshot_date: Date;
  direct_bookings?: number;
  ota_bookings?: number;
  direct_revenue?: number;
  ota_revenue?: number;
  ota_commission_paid?: number;
  occupancy_rate?: number;
  site_visitors?: number;
  site_conversion_rate?: number;
}

export interface IUpsertCampaignMetric {
  client_id: string;
  channel: ECampaignChannel;
  campaign_name: string;
  metric_date: Date;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue_attributed?: number;
  cost_per_booking?: number;
  roas?: number;
}

export interface IUpsertSiteMetric {
  client_id: string;
  metric_date: Date;
  organic_visitors?: number;
  paid_visitors?: number;
  direct_visitors?: number;
  social_visitors?: number;
  package_page_views?: number;
  checkout_starts?: number;
  checkout_completes?: number;
  avg_time_on_package?: number;
  bounce_rate?: number;
}

export interface IDashboardRepository {
  upsertSnapshot(data: IUpsertDashboardSnapshot): Promise<DashboardSnapshotEntity>;
  findSnapshotsByClientId(clientId: string, from: Date, to: Date): Promise<DashboardSnapshotEntity[]>;
  upsertCampaignMetric(data: IUpsertCampaignMetric): Promise<CampaignMetricEntity>;
  findCampaignMetricsByClientId(clientId: string, from: Date, to: Date): Promise<CampaignMetricEntity[]>;
  upsertSiteMetric(data: IUpsertSiteMetric): Promise<SiteMetricEntity>;
  findSiteMetricsByClientId(clientId: string, from: Date, to: Date): Promise<SiteMetricEntity[]>;
}
