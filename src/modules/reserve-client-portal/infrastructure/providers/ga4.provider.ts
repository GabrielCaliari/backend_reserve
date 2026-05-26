import { Injectable, Logger } from '@nestjs/common';

export interface IGa4SiteMetric {
  date: Date;
  organic_visitors: number;
  paid_visitors: number;
  direct_visitors: number;
  social_visitors: number;
  package_page_views: number;
  checkout_starts: number;
  checkout_completes: number;
  avg_time_on_package: number;
  bounce_rate: number;
}

@Injectable()
export class Ga4Provider {
  private readonly logger = new Logger(Ga4Provider.name);

  /**
   * Fetches site metrics from the GA4 Data API for the last 30 days.
   * In production, replace with actual googleapis/analyticsdata SDK calls.
   */
  async fetchSiteMetrics(accessToken: string, clientId: string): Promise<IGa4SiteMetric[]> {
    this.logger.log(`Fetching GA4 metrics for client ${clientId}`);

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);

    // TODO: Replace with actual GA4 Data API v1beta call:
    // POST https://analyticsdata.googleapis.com/v1beta/{property}:runReport
    // Authorization: Bearer {accessToken}
    // Body: { dateRanges, dimensions: [{name:'date'},{name:'sessionMedium'}], metrics: [...] }
    this.logger.warn(
      `GA4 fetchSiteMetrics is a stub — wire up the GA4 Data API for production use.`,
    );

    return [];
  }
}
