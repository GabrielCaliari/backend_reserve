import { MotorDomainError } from './motor.errors';

/**
 * Erros da sincronizacao de canais (Beds24, Fase 2). Os que estendem
 * MotorDomainError chegam ao DomainExceptionFilter; o de rate limit e
 * interno da fila de push (o chamador agenda not_before com backoff) e
 * NUNCA deve virar resposta HTTP.
 */

/** Tenant sem refresh token/conexao Beds24 -> 409 (via filtro). */
export class MotorChannelNotConnectedError extends MotorDomainError {
  constructor(message = 'Canal Beds24 nao conectado para o tenant') {
    super(message);
  }
}

/** Falha de auth/setup no Beds24 (invite code invalido, token rejeitado) -> 400. */
export class MotorChannelAuthError extends MotorDomainError {}

/**
 * 429 do Beds24 (creditos esgotados na janela de 5min). Erro INTERNO da
 * fila: quem chamou agenda retry com backoff exponencial — nao mapeia
 * para HTTP.
 */
export class Beds24RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number | null = null) {
    super('Beds24 respondeu 429 (rate limit)');
  }
}
