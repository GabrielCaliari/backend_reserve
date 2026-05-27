export const OVERVIEW_REPOSITORY = 'OVERVIEW_REPOSITORY';

/**
 * Raw aggregated totals for a single period.
 * Monetary values are stored and returned in **BRL centavos** (the API contract
 * unit — see docs/02 §0). The service layer passes them through (rounding only).
 * Every field is guaranteed non-null (zero-safe) by the repository.
 */
export interface IOverviewPeriodTotals {
  // From DashboardSnapshot
  directRevenue: number;
  otaRevenue: number;
  directBookings: number;
  otaBookings: number;
  otaCommissionPaid: number;
  occupancyAvg: number; // 0..1
  siteVisitors: number;
  // From CampaignMetric
  spend: number;
  attributedRevenue: number;
  campaignConversions: number;
  campaignClicks: number;
  // From SiteMetric
  organicVisitors: number;
  paidVisitors: number;
  directVisitors: number;
  socialVisitors: number;
}

export interface IOverviewChannelTotals {
  channel: string;
  spend: number;
  attributedRevenue: number;
  conversions: number;
}

/** From OtaMonthlyData (manual monthly closing). */
export interface IOverviewOtaTotals {
  otaRevenue: number;
  commissionPaid: number;
  commissionRate: number | null; // weighted/last commission rate, 0..1
  hasData: boolean;
}

/** From HotelMonthlyKpi (manual monthly insertion). */
export interface IOverviewKpi {
  revpar: number;
  adr: number;
  occupancy: number; // 0..1 (occupied_rooms / total_rooms)
  reference_month: Date;
}

export interface IOverviewTimeseriesPoint {
  date: string; // ISO date (YYYY-MM-DD)
  directRevenue: number;
  otaRevenue: number;
  spend: number;
}

export interface IOverviewRepository {
  /** Booking engine type drives CONVERSION vs ACTIVITY rendering mode. */
  findClientBookingEngine(clientId: string): Promise<string | null>;
  aggregatePeriod(clientId: string, from: Date, to: Date): Promise<IOverviewPeriodTotals>;
  aggregateChannels(clientId: string, from: Date, to: Date): Promise<IOverviewChannelTotals[]>;
  aggregateOta(clientId: string, from: Date, to: Date): Promise<IOverviewOtaTotals>;
  countWhatsappClicks(clientId: string, from: Date, to: Date): Promise<number>;
  findLatestKpi(clientId: string, from: Date, to: Date): Promise<IOverviewKpi | null>;
  buildTimeseries(clientId: string, from: Date, to: Date): Promise<IOverviewTimeseriesPoint[]>;
}
