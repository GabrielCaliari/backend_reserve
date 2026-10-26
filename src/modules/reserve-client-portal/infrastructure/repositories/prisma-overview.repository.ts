import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IOverviewRepository,
  IOverviewPeriodTotals,
  IOverviewChannelTotals,
  IOverviewOtaTotals,
  IOverviewKpi,
  IOverviewTimeseriesPoint,
} from '../../domain/interfaces/overview.repository.interface';

/** campaign_metrics guarda reais; o contrato do painel e em centavos. */
const reaisToCents = (reais: number | null | undefined) => Math.round((reais ?? 0) * 100);

/**
 * Read-only aggregation repository backing GET /hotel-portal/:clientId/overview.
 * Every query is zero-safe: missing rows yield 0, never null/undefined.
 */
@Injectable()
export class PrismaOverviewRepository implements IOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findClientBookingEngine(clientId: string): Promise<string | null> {
    try {
      const client = await this.prisma.hotelClient.findUnique({
        where: { id: clientId },
        select: { booking_engine_type: true },
      });
      return client ? String(client.booking_engine_type) : null;
    } catch (error) {
      throw new RepositoryException('Error reading hotel client booking engine', error);
    }
  }

  /**
   * Reservas que o bot confirmou e que vieram de anuncio (ad_id ou ctwa_clid no
   * snapshot da reserva). E a receita atribuida real: o Meta nao sabe do Pix.
   */
  private async sumBotAdReservations(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<{ valorCents: number; count: number }> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client?.tenant_id) return { valorCents: 0, count: 0 };
    const agg = await this.prisma.botReservation.aggregate({
      where: {
        tenant_id: client.tenant_id,
        confirmado_em: { gte: from, lte: to },
        OR: [{ source_id: { not: null } }, { ctwa_clid: { not: null } }],
      },
      _sum: { valor_cents: true },
      _count: { _all: true },
    });
    return { valorCents: agg._sum.valor_cents ?? 0, count: agg._count._all };
  }

  async aggregatePeriod(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<IOverviewPeriodTotals> {
    try {
      const [snapshots, campaigns, site, botAds] = await Promise.all([
        this.prisma.dashboardSnapshot.aggregate({
          where: { client_id: clientId, snapshot_date: { gte: from, lte: to } },
          _sum: {
            direct_revenue: true,
            ota_revenue: true,
            direct_bookings: true,
            ota_bookings: true,
            ota_commission_paid: true,
            site_visitors: true,
          },
          _avg: { occupancy_rate: true },
        }),
        this.prisma.campaignMetric.aggregate({
          where: { client_id: clientId, metric_date: { gte: from, lte: to } },
          _sum: {
            spend: true,
            revenue_attributed: true,
            conversions: true,
            clicks: true,
          },
        }),
        this.prisma.siteMetric.aggregate({
          where: { client_id: clientId, metric_date: { gte: from, lte: to } },
          _sum: {
            organic_visitors: true,
            paid_visitors: true,
            direct_visitors: true,
            social_visitors: true,
          },
        }),
        this.sumBotAdReservations(clientId, from, to),
      ]);

      return {
        directRevenue: snapshots._sum.direct_revenue ?? 0,
        otaRevenue: snapshots._sum.ota_revenue ?? 0,
        directBookings: snapshots._sum.direct_bookings ?? 0,
        otaBookings: snapshots._sum.ota_bookings ?? 0,
        otaCommissionPaid: snapshots._sum.ota_commission_paid ?? 0,
        occupancyAvg: snapshots._avg.occupancy_rate ?? 0,
        siteVisitors: snapshots._sum.site_visitors ?? 0,
        spend: reaisToCents(campaigns._sum.spend),
        attributedRevenue: reaisToCents(campaigns._sum.revenue_attributed) + botAds.valorCents,
        campaignConversions: campaigns._sum.conversions ?? 0,
        adBookings: botAds.count,
        campaignClicks: campaigns._sum.clicks ?? 0,
        organicVisitors: site._sum.organic_visitors ?? 0,
        paidVisitors: site._sum.paid_visitors ?? 0,
        directVisitors: site._sum.direct_visitors ?? 0,
        socialVisitors: site._sum.social_visitors ?? 0,
      };
    } catch (error) {
      throw new RepositoryException('Error aggregating overview period', error);
    }
  }

  async aggregateChannels(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<IOverviewChannelTotals[]> {
    try {
      const [groups, botAds] = await Promise.all([
        this.prisma.campaignMetric.groupBy({
          by: ['channel'],
          where: { client_id: clientId, metric_date: { gte: from, lte: to } },
          _sum: { spend: true, revenue_attributed: true, conversions: true },
        }),
        this.sumBotAdReservations(clientId, from, to),
      ]);

      return groups.map((g) => ({
        channel: String(g.channel),
        spend: reaisToCents(g._sum.spend),
        // Reserva do bot vinda de anuncio e click-to-WhatsApp do Meta.
        attributedRevenue:
          reaisToCents(g._sum.revenue_attributed) +
          (String(g.channel) === 'META_ADS' ? botAds.valorCents : 0),
        conversions: g._sum.conversions ?? 0,
      }));
    } catch (error) {
      throw new RepositoryException('Error aggregating overview channels', error);
    }
  }

  async aggregateOta(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<IOverviewOtaTotals> {
    try {
      const rows = await this.prisma.otaMonthlyData.findMany({
        where: { client_id: clientId, reference_month: { gte: from, lte: to } },
        orderBy: { reference_month: 'desc' },
        select: {
          ota_revenue: true,
          commission_paid: true,
          commission_rate: true,
        },
      });

      if (rows.length === 0) {
        return { otaRevenue: 0, commissionPaid: 0, commissionRate: null, hasData: false };
      }

      const otaRevenue = rows.reduce((acc, r) => acc + (r.ota_revenue ?? 0), 0);
      const commissionPaid = rows.reduce((acc, r) => acc + (r.commission_paid ?? 0), 0);
      // Use the most recent month's commission rate as the representative rate.
      const commissionRate = rows[0].commission_rate ?? null;

      return { otaRevenue, commissionPaid, commissionRate, hasData: true };
    } catch (error) {
      throw new RepositoryException('Error aggregating OTA monthly data', error);
    }
  }

  async countWhatsappClicks(clientId: string, from: Date, to: Date): Promise<number> {
    try {
      return await this.prisma.whatsAppLinkClick.count({
        where: {
          clicked_at: { gte: from, lte: to },
          Link: { client_id: clientId },
        },
      });
    } catch (error) {
      throw new RepositoryException('Error counting WhatsApp clicks', error);
    }
  }

  async findLatestKpi(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<IOverviewKpi | null> {
    try {
      const kpi = await this.prisma.hotelMonthlyKpi.findFirst({
        where: { client_id: clientId, reference_month: { gte: from, lte: to } },
        orderBy: { reference_month: 'desc' },
        select: {
          revpar: true,
          adr: true,
          total_rooms: true,
          occupied_rooms: true,
          reference_month: true,
        },
      });

      if (!kpi) return null;

      const occupancy =
        kpi.total_rooms > 0 ? (kpi.occupied_rooms ?? 0) / kpi.total_rooms : 0;

      return {
        revpar: kpi.revpar ?? 0,
        adr: kpi.adr ?? 0,
        occupancy,
        reference_month: kpi.reference_month,
      };
    } catch (error) {
      throw new RepositoryException('Error finding latest hotel KPI', error);
    }
  }

  async buildTimeseries(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<IOverviewTimeseriesPoint[]> {
    try {
      const [snapshots, campaigns] = await Promise.all([
        this.prisma.dashboardSnapshot.findMany({
          where: { client_id: clientId, snapshot_date: { gte: from, lte: to } },
          orderBy: { snapshot_date: 'asc' },
          select: {
            snapshot_date: true,
            direct_revenue: true,
            ota_revenue: true,
          },
        }),
        this.prisma.campaignMetric.groupBy({
          by: ['metric_date'],
          where: { client_id: clientId, metric_date: { gte: from, lte: to } },
          _sum: { spend: true },
        }),
      ]);

      const points = new Map<string, IOverviewTimeseriesPoint>();

      const keyOf = (d: Date) => d.toISOString().slice(0, 10);

      for (const s of snapshots) {
        const key = keyOf(s.snapshot_date);
        const point = points.get(key) ?? {
          date: key,
          directRevenue: 0,
          otaRevenue: 0,
          spend: 0,
        };
        point.directRevenue += s.direct_revenue ?? 0;
        point.otaRevenue += s.ota_revenue ?? 0;
        points.set(key, point);
      }

      for (const c of campaigns) {
        const key = keyOf(c.metric_date);
        const point = points.get(key) ?? {
          date: key,
          directRevenue: 0,
          otaRevenue: 0,
          spend: 0,
        };
        point.spend += reaisToCents(c._sum.spend);
        points.set(key, point);
      }

      return Array.from(points.values()).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      throw new RepositoryException('Error building overview timeseries', error);
    }
  }
}
