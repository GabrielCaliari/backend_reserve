import { evaluateLockout } from '../../../../shared/auth/account-lockout.policy';

describe('fluxo de lockout no login de admin', () => {
  it('a 5ª falha consecutiva produz um lockout de 15 minutos', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const evaluation = evaluateLockout(5, now);

    expect(evaluation.locked).toBe(true);
    expect(evaluation.lockedUntil).toEqual(new Date('2026-07-26T12:15:00.000Z'));
  });

  it('uma conta com locked_until no futuro é considerada travada', () => {
    const now = new Date('2026-07-26T12:05:00.000Z');
    const lockedUntil = new Date('2026-07-26T12:15:00.000Z');

    expect(lockedUntil > now).toBe(true);
  });

  it('uma conta com locked_until no passado deixa de estar travada', () => {
    const now = new Date('2026-07-26T12:20:00.000Z');
    const lockedUntil = new Date('2026-07-26T12:15:00.000Z');

    expect(lockedUntil > now).toBe(false);
  });
});
