import { Inject, Injectable } from '@nestjs/common';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import {
  OVERVIEW_REPOSITORY,
  IOverviewRepository,
  IOverviewPeriodTotals,
  IOverviewOtaTotals,
} from '../../domain/interfaces/overview.repository.interface';
import { PeriodComparisonService, Source } from '../../../../shared/analytics/period-comparison.service';

/**
 * Fallback OTA commission rate used to estimate recovered commission when the
 * client has not had a monthly OTA closing inserted yet.
 * NOTE (open decision — Plano §12): the official "comissão recuperada" formula
 * still needs sign-off from product. Current formula: directRevenue * rate.
 */
const DEFAULT_OTA_COMMISSION_RATE = 0.18;

@Injectable()
export class OverviewService {
  constructor(
    @Inject(OVERVIEW_REPOSITORY)
    private readonly overviewRepository: IOverviewRepository,
    private readonly periodComparison: PeriodComparisonService,
  ) {}

  async getOverview(clientId: string, from: Date, to: Date) {
    try {
      const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);

      const [
        bookingEngine,
        current,
        previous,
        channels,
        ota,
        otaPrev,
        whatsappClicks,
        whatsappClicksPrev,
        kpi,
        kpiPrev,
        timeseries,
      ] = await Promise.all([
        this.overviewRepository.findClientBookingEngine(clientId),
        this.overviewRepository.aggregatePeriod(clientId, from, to),
        this.overviewRepository.aggregatePeriod(clientId, prevFrom, prevTo),
        this.overviewRepository.aggregateChannels(clientId, from, to),
        this.overviewRepository.aggregateOta(clientId, from, to),
        this.overviewRepository.aggregateOta(clientId, prevFrom, prevTo),
        this.overviewRepository.countWhatsappClicks(clientId, from, to),
        this.overviewRepository.countWhatsappClicks(clientId, prevFrom, prevTo),
        this.overviewRepository.findLatestKpi(clientId, from, to),
        this.overviewRepository.findLatestKpi(clientId, prevFrom, prevTo),
        this.overviewRepository.buildTimeseries(clientId, from, to),
      ]);

      const mode = this.resolveMode(bookingEngine);
      const directSource: Source = mode === 'conversion' ? 'server' : 'manual';

      const payload = {
        period: { from: this.periodComparison.isoDate(from), to: this.periodComparison.isoDate(to) },
        comparedTo: {
          from: this.periodComparison.isoDate(prevFrom),
          to: this.periodComparison.isoDate(prevTo),
        },
        mode, // 'conversion' | 'activity' — drives front rendering (ModeGate)

        directVsOta: this.buildDirectVsOta(current, previous, ota, otaPrev, directSource),

        media: this.buildMedia(current, previous, channels),

        hotelKpis: this.buildHotelKpis(kpi, kpiPrev),

        whatsapp: {
          clicks: this.periodComparison.metric(whatsappClicks, whatsappClicksPrev, 'auto'),
        },

        timeseries: timeseries.map((p) => ({
          date: p.date,
          directRevenue: this.periodComparison.toCents(p.directRevenue),
          otaRevenue: this.periodComparison.toCents(p.otaRevenue),
          spend: this.periodComparison.toCents(p.spend),
        })),
      };

      return successResponse(payload);
    } catch (error) {
      return errorResponse('500:OVERVIEW_NOT_LOADED', 500, error);
    }
  }

  // ─── Section builders ──────────────────────────────────────────────────────

  private buildDirectVsOta(
    current: IOverviewPeriodTotals,
    previous: IOverviewPeriodTotals,
    ota: IOverviewOtaTotals,
    otaPrev: IOverviewOtaTotals,
    source: Source,
  ) {
    // Prefer the manual OTA monthly closing when present; fall back to snapshots.
    const otaRevenueNow = ota.hasData ? ota.otaRevenue : current.otaRevenue;
    const otaRevenuePrev = otaPrev.hasData ? otaPrev.otaRevenue : previous.otaRevenue;

    const directNow = current.directRevenue;
    const directPrev = previous.directRevenue;

    const directPctNow = this.periodComparison.pct(directNow, directNow + otaRevenueNow);
    const directPctPrev = this.periodComparison.pct(directPrev, directPrev + otaRevenuePrev);

    const commissionRate = ota.commissionRate ?? DEFAULT_OTA_COMMISSION_RATE;
    const commissionRecovered = directNow * commissionRate;

    return {
      directRevenue: this.periodComparison.money(directNow),
      otaRevenue: this.periodComparison.money(otaRevenueNow),
      directPct: this.periodComparison.metric(
        this.periodComparison.round1(directPctNow),
        this.periodComparison.round1(directPctPrev),
        source,
      ),
      commissionRecovered: this.periodComparison.moneyWithSource(commissionRecovered, source),
    };
  }

  private buildMedia(
    current: IOverviewPeriodTotals,
    previous: IOverviewPeriodTotals,
    channels: { channel: string; spend: number; attributedRevenue: number; conversions: number }[],
  ) {
    const roasNow = this.periodComparison.ratio(current.attributedRevenue, current.spend);
    const roasPrev = this.periodComparison.ratio(previous.attributedRevenue, previous.spend);
    const costPerBooking = this.periodComparison.ratio(current.spend, current.campaignConversions);

    return {
      spend: this.periodComparison.money(current.spend),
      roas: this.periodComparison.metric(
        this.periodComparison.round2(roasNow),
        this.periodComparison.round2(roasPrev),
        'server',
      ),
      costPerBooking: this.periodComparison.moneyWithSource(costPerBooking, 'server'),
      byChannel: channels.map((c) => ({
        channel: c.channel.toLowerCase(),
        spend: this.periodComparison.toCents(c.spend),
        attributedRevenue: this.periodComparison.toCents(c.attributedRevenue),
        roas: this.periodComparison.round2(
          this.periodComparison.ratio(c.attributedRevenue, c.spend),
        ),
        source: 'server' as Source,
      })),
    };
  }

  private buildHotelKpis(
    kpi: { revpar: number; adr: number; occupancy: number } | null,
    kpiPrev: { occupancy: number } | null,
  ) {
    if (!kpi) return null;

    const occNow = this.periodComparison.round1(kpi.occupancy * 100);
    const occPrev = kpiPrev ? this.periodComparison.round1(kpiPrev.occupancy * 100) : null;

    return {
      revpar: this.periodComparison.moneyWithSource(kpi.revpar, 'manual'),
      adr: this.periodComparison.moneyWithSource(kpi.adr, 'manual'),
      occupancy: {
        value: occNow,
        previous: occPrev,
        delta: occPrev === null ? null : this.periodComparison.round1(occNow - occPrev),
        source: 'manual' as Source,
      },
    };
  }

  // ─── Mode resolution ───────────────────────────────────────────────────────

  private resolveMode(bookingEngine: string | null): 'conversion' | 'activity' {
    if (!bookingEngine) return 'activity';
    return bookingEngine.toUpperCase() === 'MANUAL' ? 'activity' : 'conversion';
  }

}
