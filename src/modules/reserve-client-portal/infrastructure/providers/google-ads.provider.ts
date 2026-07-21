import { Injectable, Logger } from '@nestjs/common';
import { GoogleAdsApi } from 'google-ads-api';

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

interface IGoogleAdsCampaignRow {
  campaign?: { name?: string | null; advertising_channel_type?: string | null } | null;
  metrics?: {
    cost_micros?: number | null;
    impressions?: number | null;
    clicks?: number | null;
    conversions?: number | null;
    conversions_value?: number | null;
  } | null;
  segments?: { date?: string | null } | null;
}

const HOTEL_ADS_CHANNEL_TYPE = 'HOTEL';

/**
 * Real Google Ads API integration (Fase 6 Task 4 — closing the pre-existing
 * stub flagged in the plan's own research, not new master-doc scope).
 *
 * Deviation from the plan's stated "interface unchanged" note: the SDK
 * (`google-ads-api`) needs a long-lived OAuth *refresh* token plus a
 * customer (account) ID to run a GAQL report — a bare access token isn't
 * enough on its own, and the account ID has nowhere to come from in the
 * original two-argument signature. `fetchCampaignMetrics` therefore takes
 * `refreshToken`/`customerId` explicitly; `SyncGoogleAdsDataUseCase` reads
 * both from `HotelApiCredential` (the second via the new
 * `google_ads_customer_id` column added alongside this task, mirroring the
 * `ig_user_id` precedent from Fase 4 Task 1).
 */
@Injectable()
export class GoogleAdsProvider {
  private readonly logger = new Logger(GoogleAdsProvider.name);

  private client(): GoogleAdsApi {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const developer_token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!client_id || !client_secret || !developer_token) {
      throw new Error(
        'Google Ads API is not configured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN must all be set.',
      );
    }

    return new GoogleAdsApi({ client_id, client_secret, developer_token });
  }

  /**
   * Fetches campaign metrics from the Google Ads API for the last 30 days.
   */
  async fetchCampaignMetrics(
    refreshToken: string,
    customerId: string,
  ): Promise<IGoogleAdsCampaignMetric[]> {
    this.logger.log(`Fetching Google Ads metrics for customer ${customerId}`);

    try {
      const customer = this.client().Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
      });

      const gaql = `
        SELECT campaign.name, campaign.advertising_channel_type,
               metrics.cost_micros, metrics.impressions, metrics.clicks,
               metrics.conversions, metrics.conversions_value,
               segments.date
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
          AND campaign.status = 'ENABLED'
      `;

      const rows = (await customer.query(gaql)) as unknown as IGoogleAdsCampaignRow[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      this.logger.error(
        `Google Ads fetchCampaignMetrics failed for customer ${customerId}:`,
        error,
      );
      throw new Error(
        `Google Ads API request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private mapRow(row: IGoogleAdsCampaignRow): IGoogleAdsCampaignMetric {
    const spend = (row.metrics?.cost_micros ?? 0) / 1_000_000;
    const revenueAttributed = row.metrics?.conversions_value ?? 0;
    const conversions = row.metrics?.conversions ?? 0;

    return {
      campaign_name: row.campaign?.name ?? '',
      date: row.segments?.date ? new Date(row.segments.date) : new Date(),
      spend,
      impressions: row.metrics?.impressions ?? 0,
      clicks: row.metrics?.clicks ?? 0,
      conversions,
      revenue_attributed: revenueAttributed,
      cost_per_booking: conversions > 0 ? spend / conversions : undefined,
      roas: spend > 0 ? revenueAttributed / spend : undefined,
      is_hotel_ads: row.campaign?.advertising_channel_type === HOTEL_ADS_CHANNEL_TYPE,
    };
  }
}
