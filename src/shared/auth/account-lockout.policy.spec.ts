import { evaluateLockout, LOCKOUT_THRESHOLD } from './account-lockout.policy';

const NOW = new Date('2026-07-26T12:00:00.000Z');

describe('evaluateLockout', () => {
  it('não trava com zero tentativas falhas', () => {
    expect(evaluateLockout(0, NOW)).toEqual({ locked: false });
  });

  it('não trava abaixo do limite', () => {
    for (let attempts = 1; attempts < LOCKOUT_THRESHOLD; attempts += 1) {
      expect(evaluateLockout(attempts, NOW).locked).toBe(false);
    }
  });

  it('trava 15 minutos no primeiro ciclo (5 tentativas)', () => {
    const result = evaluateLockout(5, NOW);
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T12:15:00.000Z'));
  });

  it('dobra a janela no segundo ciclo (10 tentativas)', () => {
    const result = evaluateLockout(10, NOW);
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T12:30:00.000Z'));
  });

  it('dobra de novo no terceiro ciclo (15 tentativas)', () => {
    const result = evaluateLockout(15, NOW);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T13:00:00.000Z'));
  });

  it('não trava dentro de um ciclo já iniciado', () => {
    // 6, 7, 8 e 9 estão entre ciclos: quem incrementa-e-checa não deve
    // travar de novo a cada tentativa, só ao fechar o múltiplo de 5.
    for (const attempts of [6, 7, 8, 9]) {
      expect(evaluateLockout(attempts, NOW).locked).toBe(false);
    }
  });

  it('limita a janela em 24 horas', () => {
    const result = evaluateLockout(5 * 20, NOW); // ciclo 20 → 15min * 2^19
    expect(result.lockedUntil).toEqual(new Date('2026-07-27T12:00:00.000Z'));
  });
});
