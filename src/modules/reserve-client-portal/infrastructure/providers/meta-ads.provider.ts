import { Injectable, Logger } from '@nestjs/common';

export interface IMetaAdsCampaignMetric {
  campaign_name: string;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_attributed: number;
  cost_per_booking?: number;
  roas?: number;
}

@Injectable()
export class MetaAdsProvider {
  private readonly logger = new Logger(MetaAdsProvider.name);

  /**
   * Fetches campaign insights from the Meta Marketing API. Defaults to the
   * last 30 days; pass `range` for a wider window (Fase 5 Task 5's historical
   * baseline import uses up to 37 months back).
   * In production, replace with actual Meta Graph API calls.
   */
  async fetchCampaignMetrics(
    accessToken: string,
    clientId: string,
    range?: { from: Date; to: Date },
  ): Promise<IMetaAdsCampaignMetric[]> {
    void range; // stub — real implementation will pass this through to date_preset/time_range
    this.logger.log(`Fetching Meta Ads metrics for client ${clientId}`);

    // TODO: Replace with actual Meta Marketing API call:
    // GET https://graph.facebook.com/v19.0/act_{ad_account_id}/insights
    // ?fields=campaign_name,spend,impressions,clicks,conversions,purchase_roas,action_values
    // &date_preset=last_30d
    // &level=campaign
    // &access_token={accessToken}
    this.logger.warn(
      `Meta Ads fetchCampaignMetrics is a stub — wire up the Meta Marketing API for production use.`,
    );

    return [];
  }
}
