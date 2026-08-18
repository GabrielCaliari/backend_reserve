/**
 * Erros de dominio do motor de reservas. Mapeados para HTTP no
 * DomainExceptionFilter — services lancam, controllers nao traduzem.
 */
export class MotorDomainError extends Error {}

/** Entrada invalida (datas, capacidade, payload) -> 400. */
export class MotorValidationError extends MotorDomainError {}

/** Recurso do motor inexistente no tenant -> 404. */
export class MotorNotFoundError extends MotorDomainError {}

/**
 * Nenhuma unit livre do tipo no periodo (corrida perdida ou esgotado) -> 409.
 * O bot trata com a mensagem de esgotado e SEMPRE refaz GET /availability
 * antes de oferecer alternativa (spec §6).
 */
export class MotorTipoEsgotadoError extends MotorDomainError {
  constructor(message = 'Tipo esgotado no periodo') {
    super(message);
  }
}

/** Operacao exige hold ATIVO (ou convertivel) -> 409. */
export class MotorHoldNotActiveError extends MotorDomainError {}
