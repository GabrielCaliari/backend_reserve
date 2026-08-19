import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AvailabilityService } from './availability.service';
import { MotorValidationError } from '../../domain/errors/motor.errors';
import { addDaysUtc, isoDate, nightsBetween, utcDate } from '../../domain/constants/motor.constants';

@Injectable()
export class RateGridService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  /** Grade de tarifas por tipo e dia (spec §5) — cruza inventario diario com unidades livres. */
  async grade(tenantId: string, from: string, to: string) {
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRe.test(from) || !isoRe.test(to)) {
      throw new MotorValidationError('from/to devem ser YYYY-MM-DD');
    }
    const start = utcDate(from);
    const endExclusive = addDaysUtc(utcDate(to), 1);
    const span = nightsBetween(start, endExclusive);
    if (span < 1) throw new MotorValidationError('to deve ser maior ou igual a from');
    if (span > 62) throw new MotorValidationError('janela maxima de 62 dias');

    const roomTypes = await this.prisma.motorRoomType.findMany({
      where: { tenant_id: tenantId, ativo: true },
      include: { units: { where: { ativo: true }, select: { id: true } } },
      orderBy: { ordem: 'asc' },
    });
    const inventory = await this.prisma.motorDailyInventory.findMany({
      where: { tenant_id: tenantId, data: { gte: start, lt: endExclusive } },
    });
    const invByKey = new Map<string, (typeof inventory)[number]>();
    for (const row of inventory) invByKey.set(`${row.room_type_id}:${isoDate(row.data)}`, row);

    const result = [];
    for (const rt of roomTypes) {
      // sequencial de proposito: pool pg max 3
      const freeMap = await this.availability.freeCountByNight(tenantId, rt.id, start, endExclusive);
      const dias = [];
      for (let d = start; d < endExclusive; d = addDaysUtc(d, 1)) {
        const iso = isoDate(d);
        const inv = invByKey.get(`${rt.id}:${iso}`);
        dias.push({
          data: iso,
          preco: inv ? inv.preco : null,
          min_stay: inv ? inv.min_stay : null,
          stop_sell: inv?.stop_sell ?? false,
          closed_arrival: inv?.closed_arrival ?? false,
          closed_departure: inv?.closed_departure ?? false,
          override: inv?.override ?? false,
          unidades_livres: freeMap.get(iso) ?? 0,
        });
      }
      result.push({
        room_type_id: rt.id,
        nome: rt.nome,
        capacidade_base: rt.capacidade_base,
        capacidade_max: rt.capacidade_max,
        valor_pessoa_adicional: rt.valor_pessoa_adicional,
        total_units: rt.units.length,
        dias,
      });
    }
    return { from, to, room_types: result };
  }
}
