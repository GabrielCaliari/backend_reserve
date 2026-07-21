import { Injectable, Logger } from '@nestjs/common';
import { GoogleAdsProvider } from '../../infrastructure/providers/google-ads.provider';
import { CampaignService } from '../services/campaign.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';
import { EPlatform } from '../../domain/enums/platform.enum';
import { ECampaignChannel } from '../../domain/enums/campaign-channel.enum';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';

@Injectable()
export class SyncGoogleAdsDataUseCase {
  private readonly logger = new Logger(SyncGoogleAdsDataUseCase.name);

  constructor(
    private readonly googleAdsProvider: GoogleAdsProvider,
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  async execute(clientId: string): Promise<void> {
    this.logger.log(`Starting Google Ads sync for client ${clientId}`);

    const credential = await this.prisma.hotelApiCredential.findUnique({
      where: {
        client_id_platform: { client_id: clientId, platform: EPlatform.GOOGLE_ADS },
      },
    });

    if (!credential) {
      this.logger.warn(`No Google Ads credential found for client ${clientId}`);
      return;
    }

    if (!credential.google_ads_customer_id) {
      this.logger.warn(
        `Google Ads credential for client ${clientId} has no google_ads_customer_id configured — skipping sync.`,
      );
      await this.prisma.hotelApiCredential.update({
        where: { id: credential.id },
        data: {
          sync_status: EIntegrationStatus.ERROR,
          error_message: 'google_ads_customer_id is not configured for this credential.',
        },
      });
      return;
    }

    try {
      // `encrypted_token` stores the long-lived OAuth refresh token — a raw
      // access token would expire long before this credential is used again
      // by the next 6-hour cron tick, so the SDK's refresh_token param is
      // what this field has always had to mean in practice.
      const refreshToken = this.aesEncryption.decrypt(credential.encrypted_token);
      const campaigns = await this.googleAdsProvider.fetchCampaignMetrics(
        refreshToken,
        credential.google_ads_customer_id,
      );

      for (const campaign of campaigns) {
        await this.campaignService.upsertMetric({
          client_id: clientId,
          channel: campaign.is_hotel_ads ? ECampaignChannel.GOOGLE_HOTEL_ADS : ECampaignChannel.GOOGLE_ADS,
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

      this.logger.log(`Google Ads sync completed for client ${clientId}: ${campaigns.length} records`);
    } catch (error) {
      this.logger.error(`Google Ads sync failed for client ${clientId}:`, error);

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
