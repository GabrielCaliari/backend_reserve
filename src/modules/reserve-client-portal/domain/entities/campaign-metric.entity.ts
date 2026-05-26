import { ECampaignChannel } from '../enums/campaign-channel.enum';

export class CampaignMetricEntity {
  id: string;
  client_id: string;
  channel: ECampaignChannel;
  campaign_name: string;
  metric_date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_attributed: number;
  cost_per_booking?: number | null;
  roas?: number | null;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<CampaignMetricEntity>) {
    Object.assign(this, partial);
  }
}
