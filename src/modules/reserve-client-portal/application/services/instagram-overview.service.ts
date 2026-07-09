import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { Metric, PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { InstagramProvider, IInstagramMedia } from '../../infrastructure/providers/instagram.provider';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';
import { EPlatform } from '../../domain/enums/platform.enum';

export interface IInstagramOverview {
  followers: Metric;
  reach: Metric;
  engagement: {
    totalInteractions: Metric;
    engagedAccounts: Metric;
    rate: Metric;
  };
  topPosts: IInstagramMedia[];
}

/**
 * §3.4/§3.6 Instagram overview. followers is a running total, not a
 * per-period flow — its delta compares the snapshot at period-start vs.
 * period-end (never "vs. the previous period", which is what every other
 * metric here uses via PeriodComparisonService).
 */
@Injectable()
export class InstagramOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodComparison: PeriodComparisonService,
    private readonly instagramProvider: InstagramProvider,
    private readonly aesEncryption: AesEncryptionProvider,
  ) {}

  async getOverview(clientId: string, from: Date, to: Date): Promise<IInstagramOverview> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });

    if (!client?.tenant_id) {
      throw new BadRequestException('Client has no linked tenant_id');
    }

    const tenantId = client.tenant_id;
    const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);

    const [currentSnapshots, previousSnapshots, topPosts] = await Promise.all([
      this.snapshotsInRange(tenantId, from, to),
      this.snapshotsInRange(tenantId, prevFrom, prevTo),
      this.fetchTopPosts(clientId),
    ]);

    const followers = this.followersMetric(currentSnapshots);
    const reach = this.periodComparison.metric(
      this.sum(currentSnapshots, 'reach'),
      previousSnapshots.length ? this.sum(previousSnapshots, 'reach') : null,
      'auto',
    );
    const totalInteractions = this.periodComparison.metric(
      this.sum(currentSnapshots, 'total_interactions'),
      previousSnapshots.length ? this.sum(previousSnapshots, 'total_interactions') : null,
      'auto',
    );
    const engagedAccounts = this.periodComparison.metric(
      this.sum(currentSnapshots, 'engaged_accounts'),
      previousSnapshots.length ? this.sum(previousSnapshots, 'engaged_accounts') : null,
      'auto',
    );

    const currentRate = this.periodComparison.ratio(
      this.sum(currentSnapshots, 'total_interactions'),
      this.sum(currentSnapshots, 'reach'),
    );
    const previousRate = previousSnapshots.length
      ? this.periodComparison.ratio(
          this.sum(previousSnapshots, 'total_interactions'),
          this.sum(previousSnapshots, 'reach'),
        )
      : null;

    return {
      followers,
      reach,
      engagement: {
        totalInteractions,
        engagedAccounts,
        rate: this.periodComparison.metric(this.periodComparison.round2(currentRate), previousRate, 'auto'),
      },
      topPosts,
    };
  }

  private followersMetric(
    snapshots: { date: Date; followers_count: number }[],
  ): Metric {
    if (!snapshots.length) {
      return this.periodComparison.metric(0, null, 'auto');
    }
    const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
    const periodStart = sorted[0].followers_count;
    const periodEnd = sorted[sorted.length - 1].followers_count;
    return this.periodComparison.metric(periodEnd, periodStart, 'auto');
  }

  private sum(
    snapshots: Record<string, unknown>[],
    field: 'reach' | 'total_interactions' | 'engaged_accounts',
  ): number {
    return snapshots.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
  }

  private snapshotsInRange(tenantId: string, from: Date, to: Date) {
    return this.prisma.igDailySnapshot.findMany({
      where: { tenant_id: tenantId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  /** Live top-media call — not cached, per the interface contract. */
  private async fetchTopPosts(clientId: string): Promise<IInstagramMedia[]> {
    const credential = await this.prisma.hotelApiCredential.findUnique({
      where: { client_id_platform: { client_id: clientId, platform: EPlatform.INSTAGRAM } },
    });

    if (!credential?.ig_user_id) {
      return [];
    }

    try {
      const accessToken = this.aesEncryption.decrypt(credential.encrypted_token);
      return await this.instagramProvider.fetchTopMedia(accessToken, credential.ig_user_id, 3);
    } catch {
      // Live Graph API call — a transient failure here must not break the
      // rest of the overview response (reach/engagement still come from
      // stored snapshots).
      return [];
    }
  }
}
