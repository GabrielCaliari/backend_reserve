export const LOCKOUT_THRESHOLD = 5;
const BASE_LOCKOUT_MINUTES = 15;
const MAX_LOCKOUT_MINUTES = 24 * 60;

export interface LockoutEvaluation {
  locked: boolean;
  lockedUntil?: Date;
}

/**
 * Lockout progressivo de conta: dispara somente quando failedAttempts é um
 * múltiplo exato de LOCKOUT_THRESHOLD (5, 10, 15...), para que quem
 * incrementa-e-checa trave uma vez por ciclo, não a cada tentativa dentro
 * dele. Cada ciclo dobra a janela, com teto de 24 h.
 */
export function evaluateLockout(failedAttempts: number, now: Date = new Date()): LockoutEvaluation {
  if (failedAttempts === 0 || failedAttempts % LOCKOUT_THRESHOLD !== 0) {
    return { locked: false };
  }

  const cycle = failedAttempts / LOCKOUT_THRESHOLD; // 1, 2, 3...
  const minutes = Math.min(BASE_LOCKOUT_MINUTES * Math.pow(2, cycle - 1), MAX_LOCKOUT_MINUTES);
  const lockedUntil = new Date(now.getTime() + minutes * 60_000);

  return { locked: true, lockedUntil };
}
