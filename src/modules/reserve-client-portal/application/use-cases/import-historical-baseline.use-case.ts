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
 * NOTE: MetaAdsProvider.fetchCampaignMetrics / Ga4Provider.fetchSiteMetrics
 * are stubs today (return []), so this currently imports nothing in
 * practice — but the range-parameter plumbing (this task's actual scope,
 * per the plan) is in place end-to-end for when those providers are wired to
 * the real APIs.
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
