import { Injectable, Logger } from '@nestjs/common';

export interface IGoogleAdsCampaignMetric {
  campaign_name: string;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_attributed: number;
  cost_per_booking?: number;
  roas?: number;
  is_hotel_ads: boolean;
}

@Injectable()
export class GoogleAdsProvider {
  private readonly logger = new Logger(GoogleAdsProvider.name);

  /**
   * Fetches campaign metrics from the Google Ads API for the last 30 days.
   * In production, replace with actual google-ads-api SDK calls.
   */
  async fetchCampaignMetrics(
    accessToken: string,
    clientId: string,
  ): Promise<IGoogleAdsCampaignMetric[]> {
    this.logger.log(`Fetching Google Ads metrics for client ${clientId}`);

    // TODO: Replace with actual Google Ads API call (GAQL):
    // SELECT campaign.name, metrics.cost_micros, metrics.impressions,
    //        metrics.clicks, metrics.conversions, metrics.conversions_value,
    //        campaign.advertising_channel_type
    // FROM campaign
    // WHERE segments.date DURING LAST_30_DAYS
    //   AND campaign.status = 'ENABLED'
    this.logger.warn(
      `Google Ads fetchCampaignMetrics is a stub — wire up the Google Ads API for production use.`,
    );

    return [];
  }
}
