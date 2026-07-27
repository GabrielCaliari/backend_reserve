import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export interface IInstagramProfile {
  followersCount: number;
  mediaCount: number;
}

export interface IInstagramInsights {
  reach: number;
  accountsEngaged: number;
  totalInteractions: number;
}

export interface IInstagramMedia {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  likeCount: number;
  commentCount: number;
  timestamp: string;
}

/**
 * Thin wrappers around the Instagram Graph API (§3.4 — "mesma infraestrutura
 * OAuth da Meta já usada para Ads"). Each method maps the raw Graph API
 * response into the typed shape the rest of the module consumes, following
 * meta-ads.provider.ts's thinness rather than google-ads.provider.ts's stub
 * pattern.
 */
@Injectable()
export class InstagramProvider {
  private readonly logger = new Logger(InstagramProvider.name);

  async fetchProfile(accessToken: string, igUserId: string): Promise<IInstagramProfile> {
    const response = await this.get<{ followers_count?: number; media_count?: number }>(
      `${GRAPH_API_BASE}/${igUserId}`,
      accessToken,
      { fields: 'followers_count,media_count' },
    );

    return {
      followersCount: response.followers_count ?? 0,
      mediaCount: response.media_count ?? 0,
    };
  }

  async fetchInsights(
    accessToken: string,
    igUserId: string,
    period: 'day' = 'day',
  ): Promise<IInstagramInsights> {
    const response = await this.get<{
      data?: { name: string; values?: { value: number }[] }[];
    }>(`${GRAPH_API_BASE}/${igUserId}/insights`, accessToken, {
      metric: 'reach,accounts_engaged,total_interactions',
      period,
    });

    const metricValue = (name: string): number => {
      const metric = response.data?.find((m) => m.name === name);
      return metric?.values?.[0]?.value ?? 0;
    };

    return {
      reach: metricValue('reach'),
      accountsEngaged: metricValue('accounts_engaged'),
      totalInteractions: metricValue('total_interactions'),
    };
  }

  async fetchTopMedia(
    accessToken: string,
    igUserId: string,
    limit = 3,
  ): Promise<IInstagramMedia[]> {
    const response = await this.get<{
      data?: {
        id: string;
        caption?: string;
        media_url?: string;
        like_count?: number;
        comments_count?: number;
        timestamp: string;
      }[];
    }>(`${GRAPH_API_BASE}/${igUserId}/media`, accessToken, {
      fields: 'id,caption,media_url,like_count,comments_count,timestamp',
      limit: Math.max(limit, 25), // over-fetch recent posts so we can rank by engagement
    });

    const media = (response.data ?? []).map((m) => ({
      id: m.id,
      caption: m.caption ?? null,
      mediaUrl: m.media_url ?? null,
      likeCount: m.like_count ?? 0,
      commentCount: m.comments_count ?? 0,
      timestamp: m.timestamp,
    }));

    return media
      .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
      .slice(0, limit);
  }

  private async get<T>(
    url: string,
    accessToken: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    try {
      const { data } = await axios.get<T>(url, {
        params: { ...params, access_token: accessToken },
      });
      return data;
    } catch (error) {
      // access_token travels in the query string (Graph API requirement), so
      // never log the raw error/axios config here — it embeds the token.
      const message = axios.isAxiosError(error)
        ? (error.response?.data ?? error.message)
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(`Instagram Graph API call failed for ${url}: ${JSON.stringify(message)}`);
      throw new Error(
        `Instagram Graph API request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
