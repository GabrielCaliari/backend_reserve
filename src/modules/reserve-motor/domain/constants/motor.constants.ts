import { EMotorHoldFormaPagamento } from '../../../../generated/prisma/enums';

/**
 * TTL do hold por forma de pagamento (spec §2/§4). PIX_MANUAL existe para o
 * Pix direto com a equipe: TAMBEM cria hold, senao reabre o overbooking que
 * o motor existe para matar.
 */
export const HOLD_TTL_MINUTES: Record<EMotorHoldFormaPagamento, number> = {
  PIX_LINK: 60,
  CARTAO: 30,
  PIX_MANUAL: 120,
};

/** Horizonte de materializacao do daily_inventory (1 ano, como o Beds24 le). */
export const MATERIALIZE_HORIZON_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' -> Date em UTC meia-noite (datas de calendario nunca tem fuso). */
export function utcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Noites = checkout - checkin (checkout exclusivo, spec §1). */
export function nightsBetween(checkin: Date, checkout: Date): number {
  return Math.round((checkout.getTime() - checkin.getTime()) / MS_PER_DAY);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Bitmask da spec: seg=1, ter=2, qua=4, qui=8, sex=16, sab=32, dom=64. */
export function dowBit(date: Date): number {
  const day = date.getUTCDay(); // 0=dom ... 6=sab
  return day === 0 ? 64 : 1 << (day - 1);
}
