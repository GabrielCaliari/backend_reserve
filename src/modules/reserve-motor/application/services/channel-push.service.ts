import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  MATERIALIZE_HORIZON_DAYS,
  addDaysUtc,
  isoDate,
  utcDate,
} from '../../domain/constants/motor.constants';
import { Beds24RateLimitError } from '../../domain/errors/channel.errors';
import { Beds24ApiProvider } from '../../infrastructure/providers/beds24-api.provider';
import { MotorBotEventsProvider } from '../../infrastructure/providers/motor-bot-events.provider';
import { Beds24CalendarPushItem, Beds24CalendarSegment } from '../dtos/channel.dto';
import { AvailabilityService } from './availability.service';

/** Backoff exponencial em falha/429: 1min -> 4min -> 15min (spec §3). */
const BACKOFF_MINUTES = [1, 4, 15];
const MAX_ATTEMPTS = 5;

interface QueueItem {
  id: string;
  tenant_id: string;
  room_type_id: string;
  range_inicio: Date;
  range_fim: Date;
  attempts: number;
}

/**
 * Fila de push ao Beds24 com debounce (spec §3/§11). enqueue coalesce por
 * tenant/room_type (o range so expande); drain roda a cada 30s e monta UM
 * POST /inventory/rooms/calendar por tenant com ranges por quarto — NUNCA
 * uma chamada por dia de calendario (creditos em janela de 5min).
 * enqueue nunca lanca: os gatilhos (hold, reserva, block, inventario) sao
 * fire-and-forget e nao podem quebrar o fluxo principal.
 */
@Injectable()
export class ChannelPushService {
  private readonly logger = new Logger(ChannelPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly beds24: Beds24ApiProvider,
    private readonly botEvents: MotorBotEventsProvider,
  ) {}

  /**
   * Range com fim EXCLUSIVO (mesma convencao checkin/checkout). Item
   * PENDENTE existente do mesmo tenant/room_type apenas expande o range —
   * o debounce de 30s do cron transforma varias mudancas em um push so.
   */
  async enqueue(tenantId: string, roomTypeId: string, rangeInicio: Date, rangeFim: Date): Promise<void> {
    try {
      const existing = await this.prisma.motorChannelPushQueue.findFirst({
        where: { tenant_id: tenantId, room_type_id: roomTypeId, status: 'PENDENTE' },
      });
      if (existing) {
        await this.prisma.motorChannelPushQueue.update({
          where: { id: existing.id },
          data: {
            range_inicio: rangeInicio < existing.range_inicio ? rangeInicio : existing.range_inicio,
            range_fim: rangeFim > existing.range_fim ? rangeFim : existing.range_fim,
          },
        });
        return;
      }
      await this.prisma.motorChannelPushQueue.create({
        data: {
          tenant_id: tenantId,
          room_type_id: roomTypeId,
          range_inicio: rangeInicio,
          range_fim: rangeFim,
        },
      });
    } catch (error) {
      // Fire-and-forget: push que falhou no enqueue sera coberto pela
      // reconciliacao diaria — o fluxo principal nao pode quebrar.
      this.logger.error(`Falha ao enfileirar push (tenant ${tenantId})`, error as any);
    }
  }

  /** Drena itens PENDENTE vencidos, agrupados por tenant. Retorna o total processado. */
  async drain(): Promise<number> {
    const now = new Date();
    const items: QueueItem[] = await this.prisma.motorChannelPushQueue.findMany({
      where: { status: 'PENDENTE', OR: [{ not_before: null }, { not_before: { lte: now } }] },
      orderBy: { created_at: 'asc' },
    });
    if (items.length === 0) return 0;

    const byTenant = new Map<string, QueueItem[]>();
    for (const item of items) {
      const list = byTenant.get(item.tenant_id) ?? [];
      list.push(item);
      byTenant.set(item.tenant_id, list);
    }

    for (const [tenantId, tenantItems] of byTenant) {
      await this.drainTenant(tenantId, tenantItems);
    }
    return items.length;
  }

  private async drainTenant(tenantId: string, tenantItems: QueueItem[]): Promise<void> {
    const sync = await this.prisma.motorChannelSyncState.findUnique({
      where: { tenant_id: tenantId },
    });
    const roomMap = (sync?.beds24_room_id_map ?? null) as Record<string, number | string> | null;
    if (!sync?.beds24_property_id || !roomMap) {
      // Canal desconectado/sem mapa: fecha os itens com nota para a fila
      // nao crescer para sempre (venda direta segue local, spec §3).
      await this.markSent(tenantItems.map((i) => i.id));
      this.logger.warn(
        `Tenant ${tenantId} sem property/room map no Beds24 — ${tenantItems.length} item(ns) da fila fechados sem push`,
      );
      return;
    }

    const payload: Beds24CalendarPushItem[] = [];
    const pushedIds: string[] = [];
    const skippedIds: string[] = [];
    for (const item of tenantItems) {
      const roomId = Number(roomMap[item.room_type_id]);
      if (!roomId) {
        skippedIds.push(item.id);
        this.logger.warn(
          `room_type ${item.room_type_id} sem beds24 roomId no mapa (tenant ${tenantId}) — item fechado sem push`,
        );
        continue;
      }
      const calendar = await this.buildCalendar(tenantId, item);
      if (calendar.length > 0) payload.push({ roomId, calendar });
      pushedIds.push(item.id);
    }
    if (skippedIds.length > 0) await this.markSent(skippedIds);
    if (pushedIds.length === 0) return;
    if (payload.length === 0) {
      await this.markSent(pushedIds);
      return;
    }

    try {
      await this.beds24.request(tenantId, 'POST', '/inventory/rooms/calendar', payload);
      await this.markSent(pushedIds);
      await this.prisma.motorChannelSyncState.update({
        where: { tenant_id: tenantId },
        data: { last_push_at: new Date() },
      });
    } catch (error) {
      await this.scheduleRetry(
        tenantId,
        tenantItems.filter((i) => pushedIds.includes(i.id)),
        error,
      );
    }
  }

  /**
   * Calendario do item: numAvail por noite (units livres considerando holds
   * ATIVOS — mesma logica do AvailabilityService), price1/minStay do
   * daily_inventory, coalescido em segmentos from/to (INCLUSIVOS no Beds24).
   * Dia sem linha de inventario ou com stop_sell vai como numAvail 0.
   */
  private async buildCalendar(tenantId: string, item: QueueItem): Promise<Beds24CalendarSegment[]> {
    const today = utcDate(new Date().toISOString().slice(0, 10));
    const horizon = addDaysUtc(today, MATERIALIZE_HORIZON_DAYS);
    const start = item.range_inicio > today ? item.range_inicio : today;
    const end = item.range_fim < horizon ? item.range_fim : horizon;
    if (start >= end) return [];

    const freeByNight = await this.availability.freeCountByNight(
      tenantId,
      item.room_type_id,
      start,
      end,
    );
    const inventory = await this.prisma.motorDailyInventory.findMany({
      where: { tenant_id: tenantId, room_type_id: item.room_type_id, data: { gte: start, lt: end } },
    });
    const invByDay = new Map<string, any>(inventory.map((d: any) => [isoDate(d.data), d]));

    const segments: Beds24CalendarSegment[] = [];
    for (let day = start; day < end; day = addDaysUtc(day, 1)) {
      const key = isoDate(day);
      const inv = invByDay.get(key);
      const sellable = inv && !inv.stop_sell;
      const entry: Beds24CalendarSegment = {
        from: key,
        to: key,
        numAvail: sellable ? (freeByNight.get(key) ?? 0) : 0,
        ...(sellable ? { price1: Number(inv.preco), minStay: inv.min_stay } : {}),
      };
      const last = segments[segments.length - 1];
      if (
        last &&
        last.numAvail === entry.numAvail &&
        last.price1 === entry.price1 &&
        last.minStay === entry.minStay &&
        isoDate(addDaysUtc(utcDate(last.to), 1)) === key
      ) {
        last.to = key;
      } else {
        segments.push(entry);
      }
    }
    return segments;
  }

  private async markSent(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.motorChannelPushQueue.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ENVIADO', not_before: null },
    });
  }

  /**
   * Falha/429: attempts++ e not_before com backoff 1min -> 4min -> 15min;
   * na 5a falha o item vira ERRO, o sync state marca ERRO e a equipe e
   * alertada (a reconciliacao diaria cobre o buraco ate resolucao).
   */
  private async scheduleRetry(tenantId: string, items: QueueItem[], error: unknown): Promise<void> {
    const retryAfterSeconds =
      error instanceof Beds24RateLimitError ? error.retryAfterSeconds : null;
    this.logger.error(
      `Push ao Beds24 falhou (tenant ${tenantId}): ${(error as Error)?.message ?? error}`,
    );
    let exhausted = false;
    for (const item of items) {
      const attempts = item.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        exhausted = true;
        await this.prisma.motorChannelPushQueue.update({
          where: { id: item.id },
          data: { status: 'ERRO', attempts },
        });
        continue;
      }
      const backoffMs = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] * 60_000;
      const delayMs = Math.max(backoffMs, (retryAfterSeconds ?? 0) * 1000);
      await this.prisma.motorChannelPushQueue.update({
        where: { id: item.id },
        data: { attempts, not_before: new Date(Date.now() + delayMs) },
      });
    }
    if (exhausted) {
      await this.prisma.motorChannelSyncState.update({
        where: { tenant_id: tenantId },
        data: { status: 'ERRO' },
      });
      await this.botEvents.dispatch(tenantId, 'canal.push.erro', {
        detalhe: 'push ao beds24 esgotou as tentativas — sincronizacao parada',
      });
    }
  }
}
