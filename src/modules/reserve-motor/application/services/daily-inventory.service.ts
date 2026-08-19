import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  MATERIALIZE_HORIZON_DAYS,
  addDaysUtc,
  dowBit,
  isoDate,
  nightsBetween,
  utcDate,
} from '../../domain/constants/motor.constants';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import { BulkDailyInventoryDto, UpsertDailyInventoryDto } from '../dtos/daily-inventory.dto';
import { ChannelPushService } from './channel-push.service';

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

  constructor(
    private readonly prisma: PrismaService,
    // Opcional para nao quebrar instancias antigas; enqueue nunca lanca.
    private readonly channelPush?: ChannelPushService,
  ) {}

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
    // Comeca em D-1 (UTC): a noite no Brasil (UTC-3) o "hoje" UTC ja e
    // amanha, e o job deixaria o dia local corrente sem linha — quebrando
    // reserva com checkin hoje. Um dia extra para tras e inocuo.
    const start = addDaysUtc(utcDate(new Date().toISOString().slice(0, 10)), -1);
    const end = addDaysUtc(start, days + 1);

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
    // Precos/regras novos precisam refletir nas OTAs (gatilho de push, §3.3).
    for (const roomTypeId of byType.keys()) {
      void this.channelPush?.enqueue(tenantId, roomTypeId, start, end);
    }
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
    let result;
    if (existing) {
      result = await this.prisma.motorDailyInventory.update({
        where: { id: existing.id },
        data: fields,
      });
    } else {
      // Aqui dto.preco e garantido pelo guard acima (cria override exige preco).
      result = await this.prisma.motorDailyInventory.create({
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
    // Override de preco/regra do dia reflete nas OTAs (gatilho de push, §3.3).
    void this.channelPush?.enqueue(tenantId, dto.room_type_id, data, addDaysUtc(data, 1));
    return result;
  }

  /**
   * Atualizacao em massa de preco/restricoes por room_type/periodo/dow_mask
   * (spec Task 3). dry_run apenas retorna o resumo sem escrever. Escrita
   * sempre grava override=true (o job de materializacao respeita a mesma
   * invariante que upsertOverride).
   */
  async bulkOverride(tenantId: string, dto: BulkDailyInventoryDto) {
    const temCampo =
      dto.preco != null || dto.min_stay != null || dto.stop_sell != null ||
      dto.closed_arrival != null || dto.closed_departure != null;
    if (!temCampo) throw new MotorValidationError('informe ao menos um campo para aplicar');

    const start = utcDate(dto.from);
    const endExclusive = addDaysUtc(utcDate(dto.to), 1);
    const span = nightsBetween(start, endExclusive);
    if (span < 1) throw new MotorValidationError('to deve ser maior ou igual a from');
    if (span > 366) throw new MotorValidationError('periodo maximo de 366 dias');

    const owned = await this.prisma.motorRoomType.findMany({
      where: { tenant_id: tenantId, id: { in: dto.room_type_ids } },
      select: { id: true },
    });
    if (owned.length !== dto.room_type_ids.length) {
      throw new MotorValidationError('room_type invalido para o tenant');
    }

    const datas: Date[] = [];
    for (let d = start; d < endExclusive; d = addDaysUtc(d, 1)) {
      if (dto.dow_mask & dowBit(d)) datas.push(d);
    }

    const existentes = await this.prisma.motorDailyInventory.findMany({
      where: { tenant_id: tenantId, room_type_id: { in: dto.room_type_ids }, data: { in: datas } },
      select: { room_type_id: true, data: true },
    });
    const existSet = new Set(existentes.map((r: any) => `${r.room_type_id}:${isoDate(r.data)}`));

    const criar: { room_type_id: string; data: Date }[] = [];
    let ignoradasSemPreco = 0;
    for (const rt of dto.room_type_ids) {
      for (const d of datas) {
        if (existSet.has(`${rt}:${isoDate(d)}`)) continue;
        if (dto.preco == null) { ignoradasSemPreco += 1; continue; }
        criar.push({ room_type_id: rt, data: d });
      }
    }

    const resumo = {
      total_datas: datas.length * dto.room_type_ids.length,
      atualizar: existSet.size,
      criar: criar.length,
      ignoradas_sem_preco: ignoradasSemPreco,
      aplicado: false,
    };
    if (dto.dry_run) return resumo;

    const campos = {
      ...(dto.preco != null ? { preco: dto.preco } : {}),
      ...(dto.min_stay != null ? { min_stay: dto.min_stay } : {}),
      ...(dto.stop_sell != null ? { stop_sell: dto.stop_sell } : {}),
      ...(dto.closed_arrival != null ? { closed_arrival: dto.closed_arrival } : {}),
      ...(dto.closed_departure != null ? { closed_departure: dto.closed_departure } : {}),
    };
    const ops: any[] = [
      this.prisma.motorDailyInventory.updateMany({
        where: { tenant_id: tenantId, room_type_id: { in: dto.room_type_ids }, data: { in: datas } },
        data: { ...campos, override: true },
      }),
    ];
    if (criar.length) {
      ops.push(this.prisma.motorDailyInventory.createMany({
        data: criar.map((c) => ({
          tenant_id: tenantId, room_type_id: c.room_type_id, data: c.data,
          preco: dto.preco!, min_stay: dto.min_stay ?? 1,
          stop_sell: dto.stop_sell ?? false,
          closed_arrival: dto.closed_arrival ?? false,
          closed_departure: dto.closed_departure ?? false,
          override: true,
        })),
        skipDuplicates: true,
      }));
    }
    await this.prisma.$transaction(ops);
    for (const rt of dto.room_type_ids) {
      void this.channelPush?.enqueue(tenantId, rt, start, endExclusive);
    }
    return { ...resumo, aplicado: true };
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
