import { Injectable, Logger } from '@nestjs/common';
import { MetaAdsProvider } from '../../infrastructure/providers/meta-ads.provider';
import { CampaignService } from '../services/campaign.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';
import { EPlatform } from '../../domain/enums/platform.enum';
import { ECampaignChannel } from '../../domain/enums/campaign-channel.enum';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';

@Injectable()
export class SyncMetaAdsDataUseCase {
  private readonly logger = new Logger(SyncMetaAdsDataUseCase.name);

  constructor(
    private readonly metaAdsProvider: MetaAdsProvider,
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  async execute(clientId: string): Promise<void> {
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

    try {
      const accessToken = this.aesEncryption.decrypt(credential.encrypted_token);
      const campaigns = await this.metaAdsProvider.fetchCampaignMetrics(accessToken, clientId);

      for (const campaign of campaigns) {
        await this.campaignService.upsertMetric({
          client_id: clientId,
          channel: ECampaignChannel.META_ADS,
          campaign_name: campaign.campaign_name,
          metric_date: campaign.date,
          spend: campaign.spend,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          conversions: campaign.conversions,
          revenue_attributed: campaign.revenue_attributed,
          cost_per_booking: campaign.cost_per_booking,
          roas: campaign.roas,
        });
      }

      await this.prisma.hotelApiCredential.update({
        where: { id: credential.id },
        data: {
          last_sync_at: new Date(),
          sync_status: EIntegrationStatus.ACTIVE,
          error_message: null,
        },
      });

      this.logger.log(`Meta Ads sync completed for client ${clientId}: ${campaigns.length} records`);
    } catch (error) {
      this.logger.error(`Meta Ads sync failed for client ${clientId}:`, error);

      await this.prisma.hotelApiCredential.update({
        where: { id: credential.id },
        data: {
          sync_status: EIntegrationStatus.ERROR,
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
