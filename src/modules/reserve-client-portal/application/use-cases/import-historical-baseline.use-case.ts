import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { SyncMetaAdsDataUseCase } from './sync-meta-ads-data.use-case';
import { SyncGa4DataUseCase } from './sync-ga4-data.use-case';

/**
 * §4.4 onboarding: importa historico de ate 37 meses das integracoes ja
 * conectadas (Meta Ads / GA4), e cria o snapshot baseline do Instagram
 * (§3.6: "followers_count nao tem historico via API -> registrar snapshot no
 * dia do onboarding como baseline"). Acao manual, disparada uma vez por
 * cliente no onboarding - nao e um cron.
 *
 * NOTE: MetaAdsProvider.fetchAdMetrics calls the real insights API in
 * one-month chunks (37 months is also Meta's own retention ceiling); Ga4Provider.fetchSiteMetrics
 * is still a stub (returns []), so the GA4 half imports nothing yet.
 */
@Injectable()
export class ImportHistoricalBaselineUseCase {
  private readonly logger = new Logger(ImportHistoricalBaselineUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMetaAds: SyncMetaAdsDataUseCase,
    private readonly syncGa4: SyncGa4DataUseCase,
  ) {}

  async execute(clientId: string, monthsBack = 37): Promise<{ imported: boolean }> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client) {
      this.logger.warn(`HotelClient ${clientId} not found — skipping baseline import`);
      return { imported: false };
    }

    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - monthsBack);
    const range = { from, to };

    await Promise.all([
      this.syncMetaAds.execute(clientId, range),
      this.syncGa4.execute(clientId, range),
    ]);

    if (client.tenant_id) {
      await this.prisma.igDailySnapshot.upsert({
        where: { tenant_id_date: { tenant_id: client.tenant_id, date: this.today() } },
        update: {},
        create: { tenant_id: client.tenant_id, date: this.today() },
      });
    }

    this.logger.log(`Historical baseline import completed for client ${clientId} (${monthsBack} months back)`);
    return { imported: true };
  }

  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
