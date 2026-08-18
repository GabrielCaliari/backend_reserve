import {
  HOLD_TTL_MINUTES,
  addDaysUtc,
  dowBit,
  isoDate,
  nightsBetween,
  utcDate,
} from './motor.constants';

describe('motor.constants', () => {
  it('usa os TTLs de hold da spec §2 (cartao 30, pix link 60, pix manual 120)', () => {
    expect(HOLD_TTL_MINUTES).toEqual({ PIX_LINK: 60, CARTAO: 30, PIX_MANUAL: 120 });
  });

  it('dowBit segue a mascara da spec (seg=1 ... dom=64)', () => {
    expect(dowBit(utcDate('2026-08-17'))).toBe(1); // segunda
    expect(dowBit(utcDate('2026-08-21'))).toBe(16); // sexta
    expect(dowBit(utcDate('2026-08-23'))).toBe(64); // domingo
  });

  it('nightsBetween usa checkout exclusivo', () => {
    expect(nightsBetween(utcDate('2026-09-05'), utcDate('2026-09-07'))).toBe(2);
  });

  it('addDaysUtc e isoDate fazem ida e volta sem fuso', () => {
    expect(isoDate(addDaysUtc(utcDate('2026-01-31'), 1))).toBe('2026-02-01');
  });
});
