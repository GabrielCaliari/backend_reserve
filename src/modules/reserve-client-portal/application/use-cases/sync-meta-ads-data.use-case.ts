import { Injectable, Logger } from '@nestjs/common';
import { IMetaAdMetric, MetaAdsApiError, MetaAdsProvider } from '../../infrastructure/providers/meta-ads.provider';
import { CampaignService } from '../services/campaign.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';
import { EPlatform } from '../../domain/enums/platform.enum';
import { ECampaignChannel } from '../../domain/enums/campaign-channel.enum';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';

interface ICampaignDay {
  campaign_id: string | null;
  campaign_name: string;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number;
}

/**
 * Sync do Meta Ads no nivel de anuncio: grava ad_metrics (uma linha por
 * anuncio por dia) e recompoe campaign_metrics como a soma dessas linhas por
 * campanha e dia. As duas escritas sao upserts pela chave natural, entao rodar
 * de novo o mesmo periodo sobrescreve em vez de duplicar.
 *
 * Token: o da propria credencial, se houver; senao o system user global da
 * Reserve (META_SYSTEM_USER_TOKEN), que enxerga as contas compartilhadas com
 * o Business Manager.
 */
@Injectable()
export class SyncMetaAdsDataUseCase {
  private readonly logger = new Logger(SyncMetaAdsDataUseCase.name);

  constructor(
    private readonly metaAdsProvider: MetaAdsProvider,
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  async execute(clientId: string, range?: { from: Date; to: Date }): Promise<void> {
    this.logger.log(`Starting Meta Ads sync for client ${clientId}`);

    const credential = await this.prisma.hotelApiCredential.findUnique({
      where: {
        client_id_platform: { client_id: clientId, platform: EPlatform.META_ADS },
      },
    });

    if (!credential) {
      this.logger.warn(`No Meta Ads credential found for client ${clientId}`);
      return;
    }

    const configError = !credential.meta_ad_account_id
      ? 'meta_ad_account_id is not configured for this credential.'
      : !credential.encrypted_token && !process.env.META_SYSTEM_USER_TOKEN
        ? 'No Meta token: credential has no encrypted_token and META_SYSTEM_USER_TOKEN is not set.'
        : null;
    if (configError) {
      this.logger.warn(`Meta Ads sync skipped for client ${clientId}: ${configError}`);
      await this.markError(credential.id, configError);
      return;
    }

    try {
      const accessToken = credential.encrypted_token
        ? this.aesEncryption.decrypt(credential.encrypted_token)
        : (process.env.META_SYSTEM_USER_TOKEN as string);
      const ads = await this.metaAdsProvider.fetchAdMetrics(
        accessToken,
        credential.meta_ad_account_id as string,
        range,
      );

      for (const ad of ads) {
        await this.upsertAdMetric(clientId, ad);
      }

      const campaignDays = this.sumByCampaignDay(ads);
      for (const day of campaignDays) {
        const result = await this.campaignService.upsertMetric({
          client_id: clientId,
          channel: ECampaignChannel.META_ADS,
          campaign_id: day.campaign_id ?? undefined,
          campaign_name: day.campaign_name,
          metric_date: day.date,
          spend: day.spend,
          impressions: day.impressions,
          clicks: day.clicks,
          conversions: day.conversations,
        });
        // CampaignService devolve o erro em vez de lancar: sem isso a sync
        // marcaria ACTIVE com o gasto da campanha faltando.
        if (result.status >= 400) {
          throw new Error(`campaign_metrics upsert failed for ${day.campaign_name} on ${day.date.toISOString()}`);
        }
      }

      await this.prisma.hotelApiCredential.update({
        where: { id: credential.id },
        data: {
          last_sync_at: new Date(),
          sync_status: EIntegrationStatus.ACTIVE,
          error_message: null,
        },
      });

      this.logger.log(
        `Meta Ads sync completed for client ${clientId}: ${ads.length} ad-days, ${campaignDays.length} campaign-days`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Meta Ads sync failed for client ${clientId}: ${message}`);

      if (error instanceof MetaAdsApiError && error.fatal) {
        // Token invalido ou sem permissao: so uma pessoa resolve. ERROR tira
        // a credencial do cron ate alguem corrigir.
        await this.markError(credential.id, message);
      } else {
        // Transitorio (limite esgotado, rede, 5xx): fica no cron e tenta no
        // proximo ciclo; so registra o motivo.
        await this.prisma.hotelApiCredential.update({
          where: { id: credential.id },
          data: { error_message: message },
        });
      }
    }
  }

  private async upsertAdMetric(clientId: string, ad: IMetaAdMetric): Promise<void> {
    const values = {
      ad_name: ad.ad_name,
      adset_id: ad.adset_id,
      adset_name: ad.adset_name,
      campaign_id: ad.campaign_id,
      campaign_name: ad.campaign_name,
      spend: ad.spend,
      impressions: ad.impressions,
      clicks: ad.clicks,
      reach: ad.reach,
      conversations: ad.conversations,
    };
    await this.prisma.adMetric.upsert({
      where: {
        client_id_ad_id_metric_date: { client_id: clientId, ad_id: ad.ad_id, metric_date: ad.date },
      },
      create: { client_id: clientId, ad_id: ad.ad_id, metric_date: ad.date, ...values },
      update: values,
    });
  }

  /** Soma as linhas de anuncio por campanha e dia (reach nao soma: fica de fora). */
  sumByCampaignDay(ads: IMetaAdMetric[]): ICampaignDay[] {
    const byKey = new Map<string, ICampaignDay>();
    for (const ad of ads) {
      const campaignKey = ad.campaign_id ?? ad.campaign_name ?? '';
      const key = `${campaignKey}|${ad.date.toISOString()}`;
      const day = byKey.get(key) ?? {
        campaign_id: ad.campaign_id,
        campaign_name: ad.campaign_name ?? ad.campaign_id ?? '',
        date: ad.date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversations: 0,
      };
      day.spend += ad.spend;
      day.impressions += ad.impressions;
      day.clicks += ad.clicks;
      day.conversations += ad.conversations;
      byKey.set(key, day);
    }
    return [...byKey.values()];
  }

  private async markError(credentialId: string, message: string): Promise<void> {
    await this.prisma.hotelApiCredential.update({
      where: { id: credentialId },
      data: { sync_status: EIntegrationStatus.ERROR, error_message: message },
    });
  }
}
