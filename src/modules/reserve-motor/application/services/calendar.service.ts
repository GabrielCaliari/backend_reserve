import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { addDaysUtc, isoDate, nightsBetween, utcDate } from '../../domain/constants/motor.constants';
import { MotorValidationError } from '../../domain/errors/motor.errors';

export type CalendarEstado = 'LIVRE' | 'HOLD' | 'CONFIRMADA' | 'OTA' | 'BLOCK' | 'MENSALISTA';

export interface CalendarDia {
  data: string;
  estado: CalendarEstado;
  reservation_id?: string;
  hold_id?: string;
  block_id?: string;
  hospede_nome?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mapa unidade x dia do mes — o que a gerente le em 5 segundos (spec §5). */
  async month(tenantId: string, mes: string) {
    if (!/^\d{4}-\d{2}$/.test(mes ?? '')) {
      throw new MotorValidationError('mes deve ser YYYY-MM');
    }
    const start = utcDate(`${mes}-01`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const unidades = await this.unidadesForWindow(tenantId, start, end);
    return { mes, unidades };
  }

  /** Mesmo grid do month, mas para uma janela arbitraria de datas (from/to inclusivo). */
  async range(tenantId: string, from: string, to: string) {
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRe.test(from) || !isoRe.test(to)) {
      throw new MotorValidationError('from/to devem ser YYYY-MM-DD');
    }
    const start = utcDate(from);
    const endExclusive = addDaysUtc(utcDate(to), 1); // to inclusivo
    const dias = nightsBetween(start, endExclusive);
    if (dias < 1) throw new MotorValidationError('to deve ser maior ou igual a from');
    if (dias > 62) throw new MotorValidationError('janela maxima de 62 dias');
    const unidades = await this.unidadesForWindow(tenantId, start, endExclusive);
    return { from, to, unidades };
  }

  private async unidadesForWindow(tenantId: string, start: Date, endExclusive: Date) {
    const units = await this.prisma.motorUnit.findMany({
      where: { tenant_id: tenantId, ativo: true },
      include: { room_type: true },
      orderBy: [{ room_type_id: 'asc' }, { identificador: 'asc' }],
    });
    const reservations = await this.prisma.motorReservation.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'] },
        checkin: { lt: endExclusive },
        checkout: { gt: start },
      },
    });
    const holds = await this.prisma.motorHold.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ATIVO',
        expires_at: { gt: new Date() },
        checkin: { lt: endExclusive },
        checkout: { gt: start },
      },
    });
    const blocks = await this.prisma.motorBlock.findMany({
      where: {
        tenant_id: tenantId,
        data_inicio: { lt: endExclusive },
        OR: [{ data_fim: null }, { data_fim: { gt: start } }],
      },
    });

    return units.map((unit: any) => {
      const dias: CalendarDia[] = [];
      for (let date = start; date < endExclusive; date = addDaysUtc(date, 1)) {
        dias.push(this.resolveDia(unit.id, date, reservations, holds, blocks));
      }
      return {
        unit_id: unit.id,
        identificador: unit.identificador,
        room_type_id: unit.room_type.id,
        room_type_nome: unit.room_type.nome,
        dias,
      };
    });
  }

  /** Precedencia: MENSALISTA > BLOCK > OTA > CONFIRMADA > HOLD > LIVRE. */
  private resolveDia(
    unitId: string,
    date: Date,
    reservations: any[],
    holds: any[],
    blocks: any[],
  ): CalendarDia {
    const dia: CalendarDia = { data: isoDate(date), estado: 'LIVRE' };
    const block = blocks.find(
      (b) =>
        b.unit_id === unitId && b.data_inicio <= date && (b.data_fim == null || date < b.data_fim),
    );
    if (block) {
      return {
        ...dia,
        estado: block.motivo === 'MENSALISTA' ? 'MENSALISTA' : 'BLOCK',
        block_id: block.id,
      };
    }
    const reservation = reservations.find(
      (r) => r.unit_id === unitId && r.checkin <= date && date < r.checkout,
    );
    if (reservation) {
      return {
        ...dia,
        estado: String(reservation.origem).startsWith('OTA_') ? 'OTA' : 'CONFIRMADA',
        reservation_id: reservation.id,
        hospede_nome: reservation.hospede_nome,
      };
    }
    const hold = holds.find((h) => h.unit_id === unitId && h.checkin <= date && date < h.checkout);
    if (hold) return { ...dia, estado: 'HOLD', hold_id: hold.id };
    return dia;
  }
}
