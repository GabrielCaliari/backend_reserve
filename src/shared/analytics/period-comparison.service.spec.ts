import { PeriodComparisonService } from './period-comparison.service';

describe('PeriodComparisonService', () => {
  const svc = new PeriodComparisonService();

  it('computes the immediately preceding period of equal length', () => {
    const { prevFrom, prevTo } = svc.previousPeriod(new Date('2026-07-15'), new Date('2026-07-30'));
    expect(prevTo.getTime()).toBe(new Date('2026-07-15').getTime() - 1);
    expect(prevTo.getTime() - prevFrom.getTime()).toBe(new Date('2026-07-30').getTime() - new Date('2026-07-15').getTime());
  });

  it('ratio() and pct() are zero-safe on a zero denominator', () => {
    expect(svc.ratio(100, 0)).toBe(0);
    expect(svc.pct(10, 0)).toBe(0);
  });

  it('metric() computes delta only when a previous value exists', () => {
    expect(svc.metric(120, 100, 'auto')).toEqual({ value: 120, previous: 100, delta: 20, source: 'auto' });
    expect(svc.metric(120, null, 'auto')).toEqual({ value: 120, previous: null, delta: null, source: 'auto' });
  });

  it('money() converts stored centavos into a BRL money object', () => {
    expect(svc.money(12345)).toEqual({ value: 12345, currency: 'BRL' });
    expect(svc.money(NaN as unknown as number)).toEqual({ value: 0, currency: 'BRL' });
  });

  it('moneyWithSource() carries the source alongside value/currency', () => {
    expect(svc.moneyWithSource(500, 'manual')).toEqual({ value: 500, currency: 'BRL', source: 'manual' });
  });

  it('ratio()/pct() compute normally with a non-zero denominator', () => {
    expect(svc.ratio(50, 25)).toBe(2);
    expect(svc.pct(25, 100)).toBe(25);
  });

  it('round1()/round2() round to 1 and 2 decimal places', () => {
    expect(svc.round1(1.2345)).toBe(1.2);
    expect(svc.round2(1.2345)).toBe(1.23);
  });

  it('isoDate() truncates a Date to its YYYY-MM-DD prefix', () => {
    expect(svc.isoDate(new Date('2026-07-15T13:45:00.000Z'))).toBe('2026-07-15');
  });
});
