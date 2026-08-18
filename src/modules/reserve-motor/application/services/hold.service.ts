import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HOLD_TTL_MINUTES, isoDate, utcDate } from '../../domain/constants/motor.constants';
import {
  MotorHoldNotActiveError,
  MotorNotFoundError,
  MotorTipoEsgotadoError,
} from '../../domain/errors/motor.errors';
import { MotorBotEventsProvider } from '../../infrastructure/providers/motor-bot-events.provider';
import { ConfirmHoldDto, CreateHoldDto } from '../dtos/hold.dto';
import { AvailabilityService } from './availability.service';

/** Violacao de constraint de exclusao do Postgres (23P01). */
export function isExclusionViolation(error: unknown): boolean {
  const message = String((error as Error)?.message ?? '');
  return message.includes('exclusion constraint') || message.includes('23P01');
}

@Injectable()
export class HoldService {
  private readonly logger = new Logger(HoldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly botEvents: MotorBotEventsProvider,
  ) {}

  /**
   * Fluxo da spec §1.2: quote -> transacao com FOR UPDATE nas units do tipo
   * -> tenta INSERT na melhor unit -> constraint estourou (outra transacao
   * ganhou) -> proxima unit -> nenhuma sobrou -> tipo esgotado (409).
   * O FOR UPDATE serializa contra reservas manuais/confirm, que travam as
   * mesmas linhas — as constraints EXCLUDE nao cruzam hold x reservation.
   */
  async create(tenantId: string, dto: CreateHoldDto) {
    const checkin = utcDate(dto.checkin);
    const checkout = utcDate(dto.checkout);
    const quote = await this.availability.quote(tenantId, {
      room_type_id: dto.room_type_id,
      checkin,
      checkout,
      adultos: dto.adultos,
      criancas: dto.criancas ?? 0,
      pets: dto.pets ?? 0,
      cliente_marina: dto.cliente_marina ?? false,
    });
    const antecipadoPct = dto.forma_pagamento === 'CARTAO' ? 1 : 0.5;
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES[dto.forma_pagamento] * 60_000);

    const hold = await this.prisma.$transaction(async (tx: any) => {
      // Trava as units do tipo: quem chegar depois espera este commit.
      await tx.$queryRaw`
        SELECT id FROM "motor_units"
        WHERE tenant_id = ${tenantId} AND room_type_id = ${dto.room_type_id} AND ativo = true
        FOR UPDATE
      `;
      const freeIds = await this.availability.freeUnitIds(
        tx,
        tenantId,
        dto.room_type_id,
        checkin,
        checkout,
      );
      for (const unitId of freeIds) {
        try {
          return await tx.motorHold.create({
            data: {
              tenant_id: tenantId,
              room_type_id: dto.room_type_id,
              unit_id: unitId,
              checkin,
              checkout,
              adultos: dto.adultos,
              criancas: dto.criancas ?? 0,
              pets: dto.pets ?? 0,
              contato_whatsapp: dto.contato_whatsapp,
              forma_pagamento: dto.forma_pagamento,
              cliente_marina: dto.cliente_marina ?? false,
              valor_total: quote.valor_total,
              valor_antecipado: Math.round(quote.valor_total * antecipadoPct * 100) / 100,
              asaas_payment_id: dto.asaas_payment_id ?? null,
              expires_at: expiresAt,
            },
          });
        } catch (error) {
          if (isExclusionViolation(error)) continue;
          throw error;
        }
      }
      throw new MotorTipoEsgotadoError();
    });

    return {
      hold_id: hold.id,
      unit_id: hold.unit_id,
      expires_at: hold.expires_at,
      valor_total: Number(hold.valor_total),
      valor_antecipado: Number(hold.valor_antecipado),
    };
  }

  /** Desistencia ou vencimento de cobranca: libera as datas. */
  async release(tenantId: string, holdId: string) {
    const hold = await this.prisma.motorHold.findFirst({
      where: { id: holdId, tenant_id: tenantId },
    });
    if (!hold) throw new MotorNotFoundError('hold nao encontrado');
    if (hold.status === 'CONVERTIDO') throw new MotorHoldNotActiveError('hold ja convertido em reserva');
    return this.prisma.motorHold.update({ where: { id: holdId }, data: { status: 'CANCELADO' } });
  }

  /**
   * Chamado pelo fluxo N8N quando o Asaas confirma o pagamento (spec §2).
   * Idempotente por asaas_payment_id. Hold EXPIRADO = pagamento tardio:
   * tenta recriar nas mesmas datas/tipo; sem vaga vira pending exception
   * com alerta PRIORITARIO (dinheiro recebido sem reserva).
   */
  async confirm(tenantId: string, holdId: string, dto: ConfirmHoldDto) {
    if (dto.asaas_payment_id) {
      const existing = await this.prisma.motorReservation.findFirst({
        where: { tenant_id: tenantId, asaas_payment_id: dto.asaas_payment_id },
      });
      if (existing) return { reservation_id: existing.id, status: existing.status };
    }
    const hold = await this.prisma.motorHold.findFirst({
      where: { id: holdId, tenant_id: tenantId },
    });
    if (!hold) throw new MotorNotFoundError('hold nao encontrado');
    if (hold.status === 'CONVERTIDO') {
      const reservation = await this.prisma.motorReservation.findFirst({
        where: { tenant_id: tenantId, room_type_id: hold.room_type_id, unit_id: hold.unit_id, checkin: hold.checkin },
      });
      return { reservation_id: reservation?.id ?? null, status: 'CONFIRMADA' };
    }
    if (hold.status === 'CANCELADO') throw new MotorHoldNotActiveError('hold cancelado');

    const isLate = hold.status === 'EXPIRADO' || hold.expires_at < new Date();
    const valorPago = dto.valor_pago ?? Number(hold.valor_antecipado);
    const formaPagamento = hold.forma_pagamento === 'CARTAO' ? 'CARTAO_100' : 'PIX_50';

    try {
      const reservation = await this.prisma.$transaction(async (tx: any) => {
        await tx.$queryRaw`
          SELECT id FROM "motor_units"
          WHERE tenant_id = ${tenantId} AND room_type_id = ${hold.room_type_id} AND ativo = true
          FOR UPDATE
        `;
        // Hold ATIVO ainda segura a propria unit; no tardio qualquer unit
        // livre do tipo serve (hospede nem percebe a troca).
        const freeIds = isLate
          ? await this.availability.freeUnitIds(tx, tenantId, hold.room_type_id, hold.checkin, hold.checkout)
          : [hold.unit_id];
        for (const unitId of freeIds) {
          try {
            const created = await tx.motorReservation.create({
              data: {
                tenant_id: tenantId,
                room_type_id: hold.room_type_id,
                unit_id: unitId,
                checkin: hold.checkin,
                checkout: hold.checkout,
                status: 'CONFIRMADA',
                origem: 'BOT_WHATSAPP',
                hospede_nome: dto.hospede_nome ?? hold.contato_whatsapp,
                hospede_telefone: hold.contato_whatsapp,
                hospede_email: dto.hospede_email ?? null,
                hospede_doc: dto.hospede_doc ?? null,
                adultos: hold.adultos,
                criancas: hold.criancas,
                pets: hold.pets,
                valor_total: hold.valor_total,
                valor_pago: valorPago,
                saldo_checkin: Math.round((Number(hold.valor_total) - valorPago) * 100) / 100,
                forma_pagamento: formaPagamento,
                asaas_payment_id: dto.asaas_payment_id ?? hold.asaas_payment_id,
                atribuicao: (dto.atribuicao as any) ?? null,
              },
            });
            await tx.motorReservationEvent.createMany({
              data: [
                { reservation_id: created.id, tipo: 'CRIADA', autor: 'motor', payload: { hold_id: hold.id } },
                { reservation_id: created.id, tipo: 'CONFIRMADA', autor: 'motor', payload: { asaas_payment_id: dto.asaas_payment_id ?? null, valor_pago: valorPago } },
              ],
            });
            await tx.motorHold.update({ where: { id: hold.id }, data: { status: 'CONVERTIDO' } });
            return created;
          } catch (error) {
            if (isExclusionViolation(error)) continue;
            throw error;
          }
        }
        throw new MotorTipoEsgotadoError();
      });
      return { reservation_id: reservation.id, status: 'CONFIRMADA' };
    } catch (error) {
      if (error instanceof MotorTipoEsgotadoError) {
        // Dinheiro recebido sem reserva: excecao PENDENTE + alerta ao bot
        // para fluxo de excecao com transferencia imediata (spec §2).
        await this.prisma.motorPaymentException.create({
          data: {
            tenant_id: tenantId,
            hold_id: hold.id,
            asaas_payment_id: dto.asaas_payment_id ?? hold.asaas_payment_id,
            valor_pago: valorPago,
          },
        });
        await this.botEvents.dispatch(tenantId, 'pagamento.tardio.exception', {
          hold_id: hold.id,
          contato_whatsapp: hold.contato_whatsapp,
          valor_pago: valorPago,
        });
      }
      throw error;
    }
  }

  /** Job por minuto: holds ATIVO vencidos -> EXPIRADO + evento ao bot. */
  async expireDue(): Promise<number> {
    const due = await this.prisma.motorHold.findMany({
      where: { status: 'ATIVO', expires_at: { lt: new Date() } },
      select: { id: true, tenant_id: true, contato_whatsapp: true, checkin: true, checkout: true },
    });
    if (due.length === 0) return 0;
    const result = await this.prisma.motorHold.updateMany({
      where: { id: { in: due.map((h: any) => h.id) }, status: 'ATIVO' },
      data: { status: 'EXPIRADO' },
    });
    for (const hold of due) {
      await this.botEvents.dispatch(hold.tenant_id, 'hold.expirado', {
        hold_id: hold.id,
        contato_whatsapp: hold.contato_whatsapp,
        checkin: hold.checkin ? isoDate(hold.checkin) : null,
        checkout: hold.checkout ? isoDate(hold.checkout) : null,
      });
    }
    this.logger.log(`Expirados ${result.count} hold(s)`);
    return result.count;
  }
}
