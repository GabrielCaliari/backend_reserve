import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/** Uma linha por anuncio por dia (insights level=ad, time_increment=1). */
export interface IMetaAdMetric {
  ad_id: string;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversations: number;
}

interface IMetaAction {
  action_type?: string;
  value?: string;
}

interface IMetaInsightsRow {
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  reach?: string;
  actions?: IMetaAction[];
}

interface IMetaInsightsPage {
  data?: IMetaInsightsRow[];
  paging?: { next?: string };
}

/**
 * Erro do Graph API com o codigo da Meta. `fatal` = token invalido (190) ou
 * sem permissao (10, 200-299): so uma pessoa resolve, a credencial vai para
 * ERROR. O resto (rede, 5xx, limite esgotado) e transitorio.
 */
export class MetaAdsApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
  ) {
    super(message);
    this.name = 'MetaAdsApiError';
  }

  get fatal(): boolean {
    return this.code === 190 || this.code === 10 || (this.code !== null && this.code >= 200 && this.code <= 299);
  }
}

/** Versao do Graph API; sobrescreva por env quando a Meta aposentar esta. */
const DEFAULT_GRAPH_API_VERSION = 'v23.0';
const DEFAULT_LOOKBACK_DAYS = 30;
/** Teto de paginas por bloco de um mes. */
const MAX_PAGES_PER_CHUNK = 100;
/** Limite de chamadas (17: conta de anuncios; 80004: insights da conta). */
const RATE_LIMIT_CODES = new Set([17, 80004]);
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 5_000;
/** Anuncio click-to-WhatsApp: a "conversao" do Meta e a conversa iniciada. */
const CONVERSATION_ACTION = 'onsite_conversion.messaging_conversation_started_7d';
const FIELDS = [
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
  'date_start',
  'spend',
  'impressions',
  'inline_link_clicks',
  'reach',
  'actions',
].join(',');

/**
 * Gasto diario por anuncio via Meta Marketing API (insights da conta de
 * anuncios). O token sozinho nao basta: a conta (act_<id>) vem de
 * HotelApiCredential.meta_ad_account_id.
 *
 * Periodos longos (importacao de historico, ate 37 meses) sao quebrados em
 * blocos de um mes: level=ad x time_increment=1 num periodo grande estoura o
 * tempo da chamada sincrona do insights.
 */
@Injectable()
export class MetaAdsProvider {
  private readonly logger = new Logger(MetaAdsProvider.name);

  /** Espera entre tentativas; substituivel nos testes. */
  protected sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  async fetchAdMetrics(
    accessToken: string,
    adAccountId: string,
    range?: { from: Date; to: Date },
  ): Promise<IMetaAdMetric[]> {
    const accountPath = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const to = range?.to ?? new Date();
    const from = range?.from ?? new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
    const url = `https://graph.facebook.com/${version}/${accountPath}/insights`;

    this.logger.log(`Fetching Meta Ads ad-level metrics for ${accountPath}`);

    const rows: IMetaInsightsRow[] = [];
    for (const chunk of this.monthChunks(from, to)) {
      let page = await this.get<IMetaInsightsPage>(url, {
        level: 'ad',
        time_increment: 1,
        time_range: JSON.stringify({ since: chunk.since, until: chunk.until }),
        fields: FIELDS,
        limit: 500,
        access_token: accessToken,
      });
      rows.push(...(page.data ?? []));

      // paging.next ja traz todos os parametros (inclusive o token).
      for (let pages = 1; page.paging?.next; pages++) {
        if (pages >= MAX_PAGES_PER_CHUNK) {
          this.logger.warn(`Meta Ads insights for ${accountPath} truncated at ${pages} pages (${chunk.since})`);
          break;
        }
        page = await this.get<IMetaInsightsPage>(page.paging.next);
        rows.push(...(page.data ?? []));
      }
    }

    return rows.filter((row) => row.ad_id).map((row) => this.mapRow(row));
  }

  /** Blocos [since, until] em dias inteiros, um por mes de calendario. */
  monthChunks(from: Date, to: Date): { since: string; until: string }[] {
    const chunks: { since: string; until: string }[] = [];
    const end = this.isoDay(to);
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

    while (this.isoDay(cursor) <= end) {
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      const until = this.isoDay(monthEnd) < end ? this.isoDay(monthEnd) : end;
      chunks.push({ since: this.isoDay(cursor), until });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return chunks;
  }

  private mapRow(row: IMetaInsightsRow): IMetaAdMetric {
    const conversations = row.actions?.find((a) => a.action_type === CONVERSATION_ACTION);
    return {
      ad_id: row.ad_id as string,
      ad_name: row.ad_name ?? null,
      adset_id: row.adset_id ?? null,
      adset_name: row.adset_name ?? null,
      campaign_id: row.campaign_id ?? null,
      campaign_name: row.campaign_name ?? null,
      date: row.date_start ? new Date(row.date_start) : new Date(),
      spend: this.num(row.spend),
      impressions: Math.round(this.num(row.impressions)),
      clicks: Math.round(this.num(row.inline_link_clicks)),
      reach: Math.round(this.num(row.reach)),
      conversations: Math.round(this.num(conversations?.value)),
    };
  }

  private num(value: string | undefined): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private isoDay(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        const { data } = await axios.get<T>(url, params ? { params } : undefined);
        return data;
      } catch (error) {
        const apiError = this.toApiError(error);
        const retryable = apiError.code !== null && RATE_LIMIT_CODES.has(apiError.code);
        if (!retryable || attempt >= MAX_ATTEMPTS) {
          this.logger.error(`Meta Ads insights request failed: ${apiError.message}`);
          throw apiError;
        }
        const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
        this.logger.warn(`Meta Ads rate limit (code ${apiError.code}); retry ${attempt} in ${delay}ms`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * access_token vai na query string (exigencia do Graph API): nunca logar a
   * url de paginacao, o erro cru ou a config do axios.
   */
  private toApiError(error: unknown): MetaAdsApiError {
    if (axios.isAxiosError(error)) {
      const graph = (error.response?.data as { error?: { message?: string; code?: number } } | undefined)?.error;
      const code = typeof graph?.code === 'number' ? graph.code : null;
      return new MetaAdsApiError(
        `Meta Ads API request failed${code !== null ? ` (code ${code})` : ''}: ${graph?.message ?? error.message}`,
        code,
      );
    }
    return new MetaAdsApiError(
      `Meta Ads API request failed: ${error instanceof Error ? error.message : String(error)}`,
      null,
    );
  }
}
