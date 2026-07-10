import { Injectable, Logger } from '@nestjs/common';
import { InstagramProvider } from '../../infrastructure/providers/instagram.provider';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EPlatform } from '../../domain/enums/platform.enum';
import { EIntegrationStatus } from '../../domain/enums/integration-status.enum';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';

@Injectable()
export class SyncInstagramDataUseCase {
  private readonly logger = new Logger(SyncInstagramDataUseCase.name);

  constructor(
    private readonly instagramProvider: InstagramProvider,
    private readonly prisma: PrismaService,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  /**
   * Resolves tenant_id from client_id, fetches profile + insights from the
   * Instagram Graph API, and upserts today's IgDailySnapshot (§3.6:
   * "followers_count não tem histórico via API → registrar snapshot no dia
   * do onboarding como baseline"). Upsert (not create) so running the 6-hour
   * cron more than once on the same day never duplicates the row.
   */
  async execute(clientId: string): Promise<void> {
    this.logger.log(`Starting Instagram sync for client ${clientId}`);

    const [credential, client] = await Promise.all([
      this.prisma.hotelApiCredential.findUnique({
        where: { client_id_platform: { client_id: clientId, platform: EPlatform.INSTAGRAM } },
      }),
      this.prisma.hotelClient.findUnique({
        where: { id: clientId },
        select: { tenant_id: true },
      }),
    ]);

    if (!credential) {
      this.logger.warn(`No Instagram credential found for client ${clientId}`);
      return;
    }

    if (!client?.tenant_id) {
      this.logger.warn(`Client ${clientId} has no linked tenant_id — skipping Instagram sync`);
      return;
    }

    if (!credential.ig_user_id) {
      this.logger.warn(
        `Instagram credential for client ${clientId} has no ig_user_id configured — skipping sync`,
      );
      return;
    }

    try {
      const accessToken = this.aesEncryption.decrypt(credential.encrypted_token);
      const [profile, insights] = await Promise.all([
        this.instagramProvider.fetchProfile(accessToken, credential.ig_user_id),
        this.instagramProvider.fetchInsights(accessToken, credential.ig_user_id),
      ]);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await this.prisma.igDailySnapshot.upsert({
        where: { tenant_id_date: { tenant_id: client.tenant_id, date: today } },
        update: {
          followers_count: profile.followersCount,
          reach: insights.reach,
          engaged_accounts: insights.accountsEngaged,
          total_interactions: insights.totalInteractions,
        },
        create: {
          tenant_id: client.tenant_id,
          date: today,
          followers_count: profile.followersCount,
          reach: insights.reach,
          engaged_accounts: insights.accountsEngaged,
          total_interactions: insights.totalInteractions,
        },
      });

      await this.prisma.hotelApiCredential.update({
        where: { id: credential.id },
        data: {
          last_sync_at: new Date(),
          sync_status: EIntegrationStatus.ACTIVE,
          error_message: null,
        },
      });

      this.logger.log(`Instagram sync completed for client ${clientId}`);
    } catch (error) {
      this.logger.error(`Instagram sync failed for client ${clientId}:`, error);

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
