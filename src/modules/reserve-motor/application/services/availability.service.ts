import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { isoDate, nightsBetween, utcDate } from '../../domain/constants/motor.constants';
import { MotorTipoEsgotadoError, MotorValidationError } from '../../domain/errors/motor.errors';
import { AvailabilityQueryDto } from '../dtos/availability.dto';

export interface QuoteParams {
  room_type_id: string;
  checkin: Date;
  checkout: Date;
  adultos: number;
  criancas: number;
  pets: number;
  cliente_marina: boolean;
}

export interface Quote {
  valor_total: number;
  min_stay: number;
}

export interface RoomTypeAvailability {
  room_type_id: string;
  nome: string;
  descricao_curta: string | null;
  capacidade_base: number;
  capacidade_max: number;
  unidades_livres: number;
  min_stay: number;
  preco_por_noite: { data: string; preco: number }[];
  valor_total: number;
}

// prisma ou tx interativa — mesmos delegates.
type Db = any;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Disponibilidade de um room_type = existe ao menos UMA unit livre em
   * TODAS as noites do periodo (spec §1.1). Livre = sem reservation ativa,
   * sem hold ATIVO nao vencido, sem block. A checagem e por sobreposicao de
   * intervalo POR UNIT — nunca "vagas por dia".
   */
  async search(tenantId: string, query: AvailabilityQueryDto): Promise<RoomTypeAvailability[]> {
    const checkin = utcDate(query.checkin);
    const checkout = utcDate(query.checkout);
    const nights = nightsBetween(checkin, checkout);
    if (nights < 1) throw new MotorValidationError('checkout deve ser posterior ao checkin');
    const criancas = query.criancas ?? 0;
    const pets = query.pets ?? 0;
    const pessoas = query.adultos + criancas;

    const roomTypes = await this.prisma.motorRoomType.findMany({
      where: { tenant_id: tenantId, ativo: true },
      include: { units: { where: { ativo: true } } },
      orderBy: { ordem: 'asc' },
    });
    const inventory = await this.prisma.motorDailyInventory.findMany({
      where: { tenant_id: tenantId, data: { gte: checkin, lt: checkout } },
    });
    const busy = await this.busyUnitIds(this.prisma, tenantId, checkin, checkout);

    const result: RoomTypeAvailability[] = [];
    for (const roomType of roomTypes) {
      if (pessoas > roomType.capacidade_max) continue;
      if (pets > 0 && !roomType.aceita_pets) continue;

      const days = inventory
        .filter((d: any) => d.room_type_id === roomType.id)
        .sort((a: any, b: any) => a.data.getTime() - b.data.getTime());
      // Toda noite precisa de linha no calendario; data sem linha = sem preco
      // definido = nao vendavel.
      if (days.length !== nights) continue;
      if (days.some((d: any) => d.stop_sell)) continue;
      if (days[0].closed_arrival) continue;
      const minStay = days[0].min_stay;
      if (nights < minStay) continue;

      const freeUnits = roomType.units.filter((u: any) => !busy.has(u.id));
      if (freeUnits.length === 0) continue;

      const base = days.reduce((sum: number, d: any) => sum + Number(d.preco), 0);
      const adicionais = Math.max(0, pessoas - roomType.capacidade_base);
      const valorAdicional = adicionais * Number(roomType.valor_pessoa_adicional) * nights;
      const valorPets = pets * Number(roomType.taxa_pet_dia) * nights;
      let total = base + valorAdicional + valorPets;
      if (query.cliente_marina) {
        total = await this.applyMarina(tenantId, roomType.id, total);
      }

      result.push({
        room_type_id: roomType.id,
        nome: roomType.nome,
        descricao_curta: roomType.descricao_curta,
        capacidade_base: roomType.capacidade_base,
        capacidade_max: roomType.capacidade_max,
        unidades_livres: freeUnits.length,
        min_stay: minStay,
        preco_por_noite: days.map((d: any) => ({ data: isoDate(d.data), preco: Number(d.preco) })),
        valor_total: Math.round(total * 100) / 100,
      });
    }
    return result;
  }

  /** Preco/validacao de UM tipo — usado por hold e reserva manual. */
  async quote(tenantId: string, params: QuoteParams): Promise<Quote> {
    const found = await this.search(tenantId, {
      checkin: isoDate(params.checkin),
      checkout: isoDate(params.checkout),
      adultos: params.adultos,
      criancas: params.criancas,
      pets: params.pets,
      cliente_marina: params.cliente_marina,
    } as AvailabilityQueryDto);
    const match = found.find((r) => r.room_type_id === params.room_type_id);
    if (!match) throw new MotorTipoEsgotadoError();
    return { valor_total: match.valor_total, min_stay: match.min_stay };
  }

  /**
   * Units LIVRES do tipo no periodo. Aceita prisma ou tx — as Tasks 7/8/9
   * chamam dentro de transacao com as units ja travadas por FOR UPDATE.
   */
  async freeUnitIds(
    db: Db,
    tenantId: string,
    roomTypeId: string,
    checkin: Date,
    checkout: Date,
    excludeReservationId?: string,
  ): Promise<string[]> {
    const units = await db.motorUnit.findMany({
      where: { tenant_id: tenantId, room_type_id: roomTypeId, ativo: true },
      orderBy: { identificador: 'asc' },
    });
    const busy = await this.busyUnitIds(db, tenantId, checkin, checkout, excludeReservationId);
    return units.filter((u: any) => !busy.has(u.id)).map((u: any) => u.id);
  }

  /**
   * Units livres POR NOITE do periodo — MESMA regra do busyUnitIds
   * (reservation ativa, hold ATIVO nao vencido, block), computada em bloco
   * para o numAvail do push de canais (Fase 2): 4 queries no total, nunca
   * uma chamada por dia de calendario (pool max 3 + rate limit Beds24).
   * Chave do mapa: isoDate da noite.
   */
  async freeCountByNight(
    tenantId: string,
    roomTypeId: string,
    checkin: Date,
    checkout: Date,
  ): Promise<Map<string, number>> {
    const units = await this.prisma.motorUnit.findMany({
      where: { tenant_id: tenantId, room_type_id: roomTypeId, ativo: true },
      select: { id: true },
    });
    const unitIds = new Set(units.map((u: any) => u.id));
    const now = new Date();
    const reservations = await this.prisma.motorReservation.findMany({
      where: {
        tenant_id: tenantId,
        room_type_id: roomTypeId,
        status: { in: ['HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'] },
        checkin: { lt: checkout },
        checkout: { gt: checkin },
      },
      select: { unit_id: true, checkin: true, checkout: true },
    });
    const holds = await this.prisma.motorHold.findMany({
      where: {
        tenant_id: tenantId,
        room_type_id: roomTypeId,
        status: 'ATIVO',
        expires_at: { gt: now },
        checkin: { lt: checkout },
        checkout: { gt: checkin },
      },
      select: { unit_id: true, checkin: true, checkout: true },
    });
    const blocks = await this.prisma.motorBlock.findMany({
      where: {
        tenant_id: tenantId,
        unit_id: { in: [...unitIds] },
        data_inicio: { lt: checkout },
        OR: [{ data_fim: null }, { data_fim: { gt: checkin } }],
      },
      select: { unit_id: true, data_inicio: true, data_fim: true },
    });

    const intervals = [
      ...reservations.map((r: any) => ({ unit_id: r.unit_id, from: r.checkin, to: r.checkout })),
      ...holds.map((h: any) => ({ unit_id: h.unit_id, from: h.checkin, to: h.checkout })),
      // data_fim null = bloqueio permanente: ocupa ate o fim do periodo.
      ...blocks.map((b: any) => ({ unit_id: b.unit_id, from: b.data_inicio, to: b.data_fim ?? checkout })),
    ].filter((i) => unitIds.has(i.unit_id));

    const result = new Map<string, number>();
    for (let night = checkin; night < checkout; night = new Date(night.getTime() + 24 * 60 * 60 * 1000)) {
      const nightEnd = new Date(night.getTime() + 24 * 60 * 60 * 1000);
      const busy = new Set<string>();
      for (const i of intervals) {
        if (i.from < nightEnd && i.to > night) busy.add(i.unit_id);
      }
      result.set(isoDate(night), unitIds.size - busy.size);
    }
    return result;
  }

  /** Units ocupadas por reservation ativa, hold ATIVO nao vencido ou block. */
  private async busyUnitIds(
    db: Db,
    tenantId: string,
    checkin: Date,
    checkout: Date,
    excludeReservationId?: string,
  ): Promise<Set<string>> {
    // 3 queries sequenciais (pool max 3, e pode estar dentro de uma tx).
    const reservations = await db.motorReservation.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'] },
        checkin: { lt: checkout },
        checkout: { gt: checkin },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      select: { unit_id: true },
    });
    const holds = await db.motorHold.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ATIVO',
        expires_at: { gt: new Date() },
        checkin: { lt: checkout },
        checkout: { gt: checkin },
      },
      select: { unit_id: true, expires_at: true },
    });
    const blocks = await db.motorBlock.findMany({
      where: {
        tenant_id: tenantId,
        data_inicio: { lt: checkout },
        OR: [{ data_fim: null }, { data_fim: { gt: checkin } }],
      },
      select: { unit_id: true },
    });
    const busy = new Set<string>();
    for (const r of reservations) busy.add(r.unit_id);
    for (const h of holds) if (h.expires_at > new Date()) busy.add(h.unit_id);
    for (const b of blocks) busy.add(b.unit_id);
    return busy;
  }

  /** Desconto Marina: rate_plan derivado com percentual_ajuste (spec v5). */
  private async applyMarina(tenantId: string, roomTypeId: string, total: number): Promise<number> {
    const plan = await this.prisma.motorRatePlan.findFirst({
      where: { tenant_id: tenantId, room_type_id: roomTypeId, nome: 'Marina', ativo: true },
    });
    if (!plan?.percentual_ajuste) return total;
    return total * (1 + Number(plan.percentual_ajuste) / 100);
  }
}
