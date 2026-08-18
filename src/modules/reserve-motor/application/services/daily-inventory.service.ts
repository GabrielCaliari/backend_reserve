import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  MATERIALIZE_HORIZON_DAYS,
  addDaysUtc,
  dowBit,
  utcDate,
} from '../../domain/constants/motor.constants';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import { UpsertDailyInventoryDto } from '../dtos/daily-inventory.dto';

interface SeasonLite {
  id: string;
  data_inicio: Date;
  data_fim: Date;
  prioridade: number;
}

interface PriceRuleLite {
  id: string;
  room_type_id: string;
  season_id: string | null;
  dow_mask: number;
  preco_noite: unknown; // Decimal
  min_stay: number;
}

@Injectable()
export class DailyInventoryService {
  private readonly logger = new Logger(DailyInventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Materializa o calendario diario a partir das price_rules (spec §1:
   * "materializada por job; edicao manual grava override e nao e
   * sobrescrita"). Estrategia: apaga as linhas NAO-override do horizonte e
   * recria via createMany com skipDuplicates — linhas override sobrevivem ao
   * delete e barram o insert da mesma data pelo unique.
   */
  async materializeTenant(tenantId: string, days = MATERIALIZE_HORIZON_DAYS): Promise<number> {
    const [rules, seasons] = await Promise.all([
      this.prisma.motorPriceRule.findMany({ where: { tenant_id: tenantId } }),
      this.prisma.motorSeason.findMany({ where: { tenant_id: tenantId } }),
    ]);
    const seasonsById = new Map<string, SeasonLite>(seasons.map((s: any) => [s.id, s]));
    const start = utcDate(new Date().toISOString().slice(0, 10));
    const end = addDaysUtc(start, days);

    const byType = new Map<string, PriceRuleLite[]>();
    for (const r of rules as any as PriceRuleLite[]) {
      const list = byType.get(r.room_type_id) ?? [];
      list.push(r);
      byType.set(r.room_type_id, list);
    }

    const rows: any[] = [];
    for (const [roomTypeId, typeRules] of byType) {
      for (let date = start; date < end; date = addDaysUtc(date, 1)) {
        const winner = this.pickRule(typeRules, seasonsById, date);
        if (!winner) continue;
        rows.push({
          tenant_id: tenantId,
          room_type_id: roomTypeId,
          data: date,
          preco: winner.preco_noite,
          min_stay: winner.min_stay,
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.motorDailyInventory.deleteMany({
        where: { tenant_id: tenantId, override: false, data: { gte: start, lt: end } },
      }),
      this.prisma.motorDailyInventory.createMany({ data: rows, skipDuplicates: true }),
    ]);
    this.logger.log(`Materializado calendario do tenant ${tenantId}: ${rows.length} linhas`);
    return rows.length;
  }

  /** Regra vencedora para a data: temporada de maior prioridade > regra base. */
  pickRule(
    rules: PriceRuleLite[],
    seasonsById: Map<string, SeasonLite>,
    date: Date,
  ): PriceRuleLite | null {
    const bit = dowBit(date);
    const candidates = rules.filter((r) => (r.dow_mask & bit) !== 0);
    const inSeason = candidates
      .filter((r) => {
        if (!r.season_id) return false;
        const season = seasonsById.get(r.season_id);
        return season && date >= season.data_inicio && date <= season.data_fim;
      })
      .sort(
        (a, b) =>
          seasonsById.get(b.season_id!)!.prioridade - seasonsById.get(a.season_id!)!.prioridade,
      );
    if (inSeason.length) return inSeason[0];
    return candidates.find((r) => !r.season_id) ?? null;
  }

  /** Edicao pontual do admin: grava override=true, o job nunca sobrescreve. */
  async upsertOverride(tenantId: string, dto: UpsertDailyInventoryDto) {
    const data = utcDate(dto.data);
    const existing = await this.prisma.motorDailyInventory.findFirst({
      where: { tenant_id: tenantId, room_type_id: dto.room_type_id, data },
    });
    if (!existing && dto.preco == null) {
      throw new MotorValidationError('data sem inventario: informe preco para criar o override');
    }
    const fields = {
      ...(dto.preco != null ? { preco: dto.preco } : {}),
      ...(dto.min_stay != null ? { min_stay: dto.min_stay } : {}),
      ...(dto.closed_arrival != null ? { closed_arrival: dto.closed_arrival } : {}),
      ...(dto.closed_departure != null ? { closed_departure: dto.closed_departure } : {}),
      ...(dto.stop_sell != null ? { stop_sell: dto.stop_sell } : {}),
      override: true,
    };
    if (existing) {
      return this.prisma.motorDailyInventory.update({ where: { id: existing.id }, data: fields });
    }
    // Aqui dto.preco e garantido pelo guard acima (cria override exige preco).
    return this.prisma.motorDailyInventory.create({
      data: {
        tenant_id: tenantId,
        room_type_id: dto.room_type_id,
        data,
        min_stay: 1,
        ...fields,
        preco: dto.preco as number,
      },
    });
  }

  async listRange(tenantId: string, roomTypeId: string, from: string, to: string) {
    if (!roomTypeId || !from || !to) {
      throw new MotorValidationError('room_type_id, from e to sao obrigatorios');
    }
    const roomType = await this.prisma.motorRoomType.findFirst({
      where: { id: roomTypeId, tenant_id: tenantId },
    });
    if (!roomType) throw new MotorNotFoundError('room_type nao encontrado');
    return this.prisma.motorDailyInventory.findMany({
      where: { tenant_id: tenantId, room_type_id: roomTypeId, data: { gte: utcDate(from), lte: utcDate(to) } },
      orderBy: { data: 'asc' },
    });
  }
}
