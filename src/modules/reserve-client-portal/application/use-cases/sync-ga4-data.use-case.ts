import { Injectable, Logger } from '@nestjs/common';
import { Ga4Provider } from '../../infrastructure/providers/ga4.provider';
import { SiteAnalyticsService } from '../services/site-analytics.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';
import { EPlatform } from '../../domain/enums/platform.enum';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';

@Injectable()
export class SyncGa4DataUseCase {
  private readonly logger = new Logger(SyncGa4DataUseCase.name);

  constructor(
    private readonly ga4Provider: Ga4Provider,
    private readonly siteAnalyticsService: SiteAnalyticsService,
    private readonly prisma: PrismaService,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  async execute(clientId: string, range?: { from: Date; to: Date }): Promise<void> {
    this.logger.log(`Starting GA4 sync for client ${clientId}`);

    const credential = await this.prisma.hotelApiCredential.findUnique({
      where: {
        client_id_platform: { client_id: clientId, platform: EPlatform.GA4 },
      },
    });

    if (!credential) {
      this.logger.warn(`No GA4 credential found for client ${clientId}`);
      return;
    }

    try {
      const accessToken = this.aesEncryption.decrypt(credential.encrypted_token);
      const metrics = await this.ga4Provider.fetchSiteMetrics(accessToken, clientId, range);

      for (const metric of metrics) {
        await this.siteAnalyticsService.upsertMetric({
          client_id: clientId,
          metric_date: metric.date,
          organic_visitors: metric.organic_visitors,
          paid_visitors: metric.paid_visitors,
          direct_visitors: metric.direct_visitors,
          social_visitors: metric.social_visitors,
          package_page_views: metric.package_page_views,
          checkout_starts: metric.checkout_starts,
          checkout_completes: metric.checkout_completes,
          avg_time_on_package: metric.avg_time_on_package,
          bounce_rate: metric.bounce_rate,
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

      this.logger.log(`GA4 sync completed for client ${clientId}: ${metrics.length} records`);
    } catch (error) {
      this.logger.error(`GA4 sync failed for client ${clientId}:`, error);

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
