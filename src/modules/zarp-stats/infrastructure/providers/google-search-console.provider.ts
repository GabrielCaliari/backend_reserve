import { Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';
import axios from 'axios';
import {
  IExternalMetricProvider,
  ConfigFieldSchema,
} from '../../domain/interfaces/external-metric-provider.interface';
import { MetricGroup, DateRange } from '../../domain/interfaces/metric-provider.interface';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscSearchAnalyticsResponse {
  rows?: GscRow[];
}

/**
 * External metric provider for Google Search Console.
 * Uses a GCP service account to authenticate directly with the GSC Data API v3.
 * Stateless — config (site_url, service_account_key) comes from StatsIntegration.config per tenant.
 *
 * Authentication: RS256 JWT signed via Node.js built-in `crypto` module.
 * No googleapis library required.
 */
@Injectable()
export class GoogleSearchConsoleProvider implements IExternalMetricProvider {
  private readonly logger = new Logger(GoogleSearchConsoleProvider.name);

  readonly integrationKey = 'google_search_console';
  readonly label = 'Google Search Console';
  readonly description =
    'SEO performance metrics from Google Search Console (clicks, impressions, CTR, position)';

  readonly configSchema: Record<string, ConfigFieldSchema> = {
    site_url: {
      type: 'string',
      required: true,
      description: 'GSC property URL (e.g. https://example.com or sc-domain:example.com)',
    },
    service_account_key: {
      type: 'json',
      required: true,
      secret: true,
      description: 'GCP service account JSON key with Search Console API access',
    },
  };

  validateConfig(config: Record<string, any>): boolean {
    if (!config?.site_url || typeof config.site_url !== 'string') return false;
    if (!config?.service_account_key) return false;

    try {
      const key =
        typeof config.service_account_key === 'string'
          ? JSON.parse(config.service_account_key)
          : config.service_account_key;
      return !!(key?.client_email && key?.private_key);
    } catch {
      return false;
    }
  }

  async getMetrics(
    config: Record<string, any>,
    _tenantId: string,
    dateRange?: DateRange,
  ): Promise<MetricGroup> {
    const now = new Date();
    const to = dateRange?.to ?? now;
    const from = dateRange?.from ?? new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const startDate = this.formatDate(from);
    const endDate = this.formatDate(to);
    const siteUrl = config.site_url as string;

    const serviceAccountKey =
      typeof config.service_account_key === 'string'
        ? JSON.parse(config.service_account_key)
        : config.service_account_key;

    const accessToken = await this.getAccessToken(serviceAccountKey);

    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    const [summaryData, topPagesData, topQueriesData] = await Promise.all([
      this.querySearchAnalytics(endpoint, accessToken, {
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      }),
      this.querySearchAnalytics(endpoint, accessToken, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 5,
      }),
      this.querySearchAnalytics(endpoint, accessToken, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 5,
      }),
    ]);

    const summary = summaryData.rows?.[0];
    const topPages = topPagesData.rows ?? [];
    const topQueries = topQueriesData.rows ?? [];

    return {
      moduleKey: this.integrationKey,
      label: this.label,
      description: this.description,
      fetchedAt: new Date(),
      metrics: [
        {
          key: 'gsc.clicks',
          label: 'Total Clicks',
          value: summary?.clicks ?? 0,
          unit: 'count',
        },
        {
          key: 'gsc.impressions',
          label: 'Total Impressions',
          value: summary?.impressions ?? 0,
          unit: 'count',
        },
        {
          key: 'gsc.ctr',
          label: 'Average CTR',
          value: summary ? `${(summary.ctr * 100).toFixed(2)}%` : '0%',
          unit: '%',
        },
        {
          key: 'gsc.position',
          label: 'Average Position',
          value: summary ? summary.position.toFixed(1) : '—',
        },
        {
          key: 'gsc.top_pages',
          label: 'Top Pages',
          value: topPages.length,
          unit: 'count',
          metadata: {
            pages: topPages.map((r) => ({
              url: r.keys[0],
              clicks: r.clicks,
              impressions: r.impressions,
              position: r.position.toFixed(1),
            })),
          },
        },
        {
          key: 'gsc.top_queries',
          label: 'Top Queries',
          value: topQueries.length,
          unit: 'count',
          metadata: {
            queries: topQueries.map((r) => ({
              query: r.keys[0],
              clicks: r.clicks,
              impressions: r.impressions,
              position: r.position.toFixed(1),
            })),
          },
        },
      ],
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async getAccessToken(serviceAccountKey: {
    client_email: string;
    private_key: string;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const scope = 'https://www.googleapis.com/auth/webmasters.readonly';
    const audience = 'https://oauth2.googleapis.com/token';

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: serviceAccountKey.client_email,
        scope,
        aud: audience,
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url');

    const signingInput = `${header}.${payload}`;

    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccountKey.private_key).toString('base64url');

    const jwt = `${signingInput}.${signature}`;

    const response = await axios.post<GoogleTokenResponse>(
      audience,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return response.data.access_token;
  }

  private async querySearchAnalytics(
    endpoint: string,
    accessToken: string,
    body: object,
  ): Promise<GscSearchAnalyticsResponse> {
    try {
      const response = await axios.post<GscSearchAnalyticsResponse>(endpoint, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      this.logger.warn(`GSC query failed: ${(error as any)?.message}`);
      return {};
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
