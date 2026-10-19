/**
 * Periodo das telas do painel (erros, feedbacks, conversas).
 *
 * O painel manda `from`/`to` como data pura (YYYY-MM-DD) ou como instante ISO.
 * Data pura e um dia no horario de Brasilia: `from` comeca as 00:00 desse dia e
 * `to` inclui o dia inteiro (menor que 00:00 do dia seguinte). Instante ISO
 * completo mantem o significado exato (gte / lte).
 *
 * Brasilia esta fixo em -03:00 desde o fim do horario de verao (2019).
 */
const DATA_PURA = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_SAO_PAULO = '-03:00';

export function isDataPura(valor: string): boolean {
  return DATA_PURA.test(valor);
}

/** 00:00 do dia em America/Sao_Paulo. */
export function inicioDoDiaSaoPaulo(data: string): Date {
  return new Date(`${data}T00:00:00.000${OFFSET_SAO_PAULO}`);
}

/** 00:00 do dia seguinte em America/Sao_Paulo (limite exclusivo). */
export function inicioDoDiaSeguinteSaoPaulo(data: string): Date {
  const inicio = inicioDoDiaSaoPaulo(data);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
}

export interface FiltroPeriodo {
  gte?: Date;
  lt?: Date;
  lte?: Date;
}

/** Monta o filtro Prisma de um campo DateTime; null quando nao ha periodo. */
export function filtroPeriodo(from?: string | null, to?: string | null): FiltroPeriodo | null {
  if (!from && !to) return null;
  const filtro: FiltroPeriodo = {};
  if (from) filtro.gte = isDataPura(from) ? inicioDoDiaSaoPaulo(from) : new Date(from);
  if (to) {
    if (isDataPura(to)) filtro.lt = inicioDoDiaSeguinteSaoPaulo(to);
    else filtro.lte = new Date(to);
  }
  return filtro;
}
