import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { SyncGa4DataUseCase } from '../../application/use-cases/sync-ga4-data.use-case';
import { SyncMetaAdsDataUseCase } from '../../application/use-cases/sync-meta-ads-data.use-case';
import { SyncGoogleAdsDataUseCase } from '../../application/use-cases/sync-google-ads-data.use-case';
import { SyncInstagramDataUseCase } from '../../application/use-cases/sync-instagram-data.use-case';
import { EPlatform } from '../../domain/enums/platform.enum';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';

@Injectable()
export class CronSyncProvider {
  private readonly logger = new Logger(CronSyncProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncGa4: SyncGa4DataUseCase,
    private readonly syncMetaAds: SyncMetaAdsDataUseCase,
    private readonly syncGoogleAds: SyncGoogleAdsDataUseCase,
    private readonly syncInstagram: SyncInstagramDataUseCase,
  ) {}

  /**
   * Runs every 6 hours to sync data from all connected integrations.
   * Cron: 0 0,6,12,18 * * *
   */
  @Cron('0 0,6,12,18 * * *')
  async syncAll(): Promise<void> {
    this.logger.log('Starting scheduled sync for all hotel clients');

    const credentials = await this.prisma.hotelApiCredential.findMany({
      where: {
        sync_status: {
          in: [EIntegrationStatus.ACTIVE, EIntegrationStatus.PENDING],
        },
        HotelClient: { is_active: true },
      },
      select: {
        client_id: true,
        platform: true,
      },
      distinct: ['client_id', 'platform'],
    });

    this.logger.log(`Found ${credentials.length} active integrations to sync`);

    for (const cred of credentials) {
      try {
        switch (cred.platform as EPlatform) {
          case EPlatform.GA4:
            await this.syncGa4.execute(cred.client_id);
            break;
          case EPlatform.META_ADS:
            await this.syncMetaAds.execute(cred.client_id);
            break;
          case EPlatform.GOOGLE_ADS:
            await this.syncGoogleAds.execute(cred.client_id);
            break;
          case EPlatform.INSTAGRAM:
            await this.syncInstagram.execute(cred.client_id);
            break;
          default:
            this.logger.warn(`Unknown platform: ${cred.platform}`);
        }
      } catch (error) {
        this.logger.error(
          `Sync failed for client ${cred.client_id} / platform ${cred.platform}:`,
          error,
        );
      }
    }

    this.logger.log('Scheduled sync completed');
  }
}
