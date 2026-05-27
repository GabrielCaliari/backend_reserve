import { Injectable } from '@nestjs/common';

export type Source = 'auto' | 'server' | 'manual';
export type Money = { value: number; currency: 'BRL' };
export type MoneyWithSource = Money & { source: Source };
export type Metric = {
  value: number;
  previous: number | null;
  delta: number | null;
  source: Source;
};

/**
 * Shared "período vs. período" comparison math, extracted from OverviewService
 * so every later phase (ROI, funnel metrics, Instagram, digest) reuses the same
 * zero-safe helpers instead of re-implementing them.
 *
 * Pure functions only — no constructor dependencies.
 */
@Injectable()
export class PeriodComparisonService {
  previousPeriod(from: Date, to: Date): { prevFrom: Date; prevTo: Date } {
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    return { prevFrom, prevTo };
  }

  /**
   * Money is stored in centavos (the contract unit). Pass through, rounding to
   * an integer to defend against float drift in aggregates/derived values.
   */
  toCents(stored: number): number {
    return Number.isFinite(stored) ? Math.round(stored) : 0;
  }

  money(stored: number): Money {
    return { value: this.toCents(stored), currency: 'BRL' };
  }

  moneyWithSource(stored: number, source: Source): MoneyWithSource {
    return { value: this.toCents(stored), currency: 'BRL', source };
  }

  metric(value: number, previous: number | null, source: Source): Metric {
    const safeValue = Number.isFinite(value) ? value : 0;
    const safePrev =
      previous === null || !Number.isFinite(previous) ? null : previous;
    return {
      value: safeValue,
      previous: safePrev,
      delta: safePrev === null ? null : this.round2(safeValue - safePrev),
      source,
    };
  }

  /** Safe division: returns 0 when the denominator is 0. */
  ratio(numerator: number, denominator: number): number {
    if (!denominator) return 0;
    return numerator / denominator;
  }

  /** Percentage 0..100, zero-safe. */
  pct(part: number, whole: number): number {
    if (!whole) return 0;
    return (part / whole) * 100;
  }

  round1(n: number): number {
    return Math.round((n ?? 0) * 10) / 10;
  }

  round2(n: number): number {
    return Math.round((n ?? 0) * 100) / 100;
  }

  isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
