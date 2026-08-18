import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { isoDate, utcDate } from '../../domain/constants/motor.constants';
import { MotorBotEventsProvider } from '../../infrastructure/providers/motor-bot-events.provider';
import { AvailabilityService } from './availability.service';
import { ChannelPushService } from './channel-push.service';
import { isExclusionViolation } from './hold.service';

/** Reserva do Beds24 normalizada (o webhook manda o JSON completo). */
interface InboundBooking {
  external_id: string;
  beds24_room_id: number | null;
  arrival: string;
  departure: string;
  cancelled: boolean;
  origem: 'OTA_BOOKING' | 'OTA_AIRBNB' | 'OTA_DECOLAR';
  modified_time: string | null;
  hospede_nome: string;
  hospede_telefone: string | null;
  hospede_email: string | null;
  adultos: number;
  criancas: number;
  valor_total: number;
}

export interface InboundResult {
  received: true;
  ignored?: boolean;
  reservation_id?: string | null;
  status?: string;
}

/**
 * Reservas das OTAs chegando pelo webhook do Beds24 (spec §3.3). Regras:
 * idempotencia por external_id + updated_at da OTA; alocacao com o MESMO
 * protocolo de lock da Fase 1 (FOR UPDATE + freeUnitIds + constraint como
 * rede); cancelamento libera as datas; toda mudanca local vira push para os
 * demais canais; overbooking real vindo de fora vira reserva HOLD + alerta
 * PRIORITARIO + sync state DIVERGENTE (resolucao humana).
 */
@Injectable()
export class ChannelInboundService {
  private readonly logger = new Logger(ChannelInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly botEvents: MotorBotEventsProvider,
    private readonly channelPush: ChannelPushService,
  ) {}

  async process(
    tenantId: string,
    providedSecret: string,
    payload: Record<string, unknown>,
  ): Promise<InboundResult> {
    const sync = await this.prisma.motorChannelSyncState.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!sync?.webhook_secret || !this.secretMatches(providedSecret, sync.webhook_secret)) {
      // Timing-safe (crypto.timingSafeEqual) — nao repetir a divida do
      // booking-webhook legado que comparava com ===.
      throw new UnauthorizedException('segredo do webhook invalido');
    }

    const booking = this.normalize(payload);
    if (!booking) {
      this.logger.warn(`Webhook beds24 sem reserva reconhecivel (tenant ${tenantId})`);
      await this.touch(tenantId);
      return { received: true, ignored: true };
    }

    const existing = await this.prisma.motorReservation.findFirst({
      where: { tenant_id: tenantId, external_id: booking.external_id },
    });

    let result: InboundResult;
    if (existing) {
      result = await this.applyUpdate(tenantId, existing, booking);
    } else if (booking.cancelled) {
      // Cancelamento de reserva que nunca entrou: nada a fazer.
      result = { received: true, ignored: true };
    } else {
      result = await this.createFromOta(tenantId, sync, booking);
    }
    await this.touch(tenantId);
    return result;
  }

  // ── normalizacao ─────────────────────────────────────────────────────────

  /** Aceita o booking no corpo raiz ou em payload.booking (formato Beds24). */
  private normalize(payload: Record<string, unknown>): InboundBooking | null {
    const raw = ((payload as any)?.booking ?? payload) as Record<string, any>;
    const id = raw?.id ?? raw?.bookId;
    const arrival = raw?.arrival;
    const departure = raw?.departure;
    if (id == null || !arrival || !departure) return null;
    const status = String(raw.status ?? '').toLowerCase();
    const channel = String(raw.channel ?? raw.referer ?? raw.apiSource ?? '');
    const nome = [raw.guestFirstName, raw.guestName]
      .filter((v: unknown) => typeof v === 'string' && v.trim().length > 0)
      .join(' ')
      .trim();
    return {
      external_id: String(id),
      beds24_room_id: raw.roomId != null ? Number(raw.roomId) : null,
      arrival: String(arrival),
      departure: String(departure),
      cancelled: status === 'cancelled',
      origem: this.mapOrigem(channel),
      modified_time: raw.modifiedTime ?? raw.modified ?? null,
      hospede_nome: nome || 'Hospede OTA',
      hospede_telefone: raw.guestPhone ?? raw.guestMobile ?? null,
      hospede_email: raw.guestEmail ?? null,
      adultos: Number(raw.numAdult ?? 2) || 2,
      criancas: Number(raw.numChild ?? 0) || 0,
      valor_total: raw.price != null ? Number(raw.price) : 0,
    };
  }

  /** Canal -> origem OTA_* (enum da Fase 1). Desconhecido cai em OTA_BOOKING com log. */
  private mapOrigem(channel: string): InboundBooking['origem'] {
    const lower = channel.toLowerCase();
    if (lower.includes('airbnb')) return 'OTA_AIRBNB';
    if (lower.includes('decolar') || lower.includes('despegar')) return 'OTA_DECOLAR';
    if (!lower.includes('booking')) {
      this.logger.warn(`Canal beds24 desconhecido "${channel}" — mapeado como OTA_BOOKING`);
    }
    return 'OTA_BOOKING';
  }

  // ── reserva existente ────────────────────────────────────────────────────

  private async applyUpdate(
    tenantId: string,
    existing: any,
    booking: InboundBooking,
  ): Promise<InboundResult> {
    // Idempotencia por external_id + updated_at da OTA: redelivery do mesmo
    // update (ou update mais antigo fora de ordem) nao reaplica nada.
    if (booking.modified_time) {
      const lastApplied = await this.prisma.motorReservationEvent.findFirst({
        where: { reservation_id: existing.id, autor: 'beds24' },
        orderBy: { created_at: 'desc' },
      });
      const stored = (lastApplied?.payload as any)?.modified_time;
      if (stored && String(stored) >= String(booking.modified_time)) {
        return { received: true, ignored: true, reservation_id: existing.id };
      }
    }

    if (booking.cancelled) {
      if (existing.status === 'CANCELADA') {
        return { received: true, ignored: true, reservation_id: existing.id };
      }
      await this.prisma.motorReservation.update({
        where: { id: existing.id },
        data: { status: 'CANCELADA' },
      });
      await this.prisma.motorReservationEvent.create({
        data: {
          reservation_id: existing.id,
          tipo: 'CANCELADA',
          autor: 'beds24',
          payload: { modified_time: booking.modified_time, external_id: booking.external_id },
        },
      });
      // Cancelamento da OTA libera as datas nos demais canais.
      void this.channelPush.enqueue(
        tenantId,
        existing.room_type_id,
        existing.checkin,
        existing.checkout,
      );
      return { received: true, reservation_id: existing.id, status: 'CANCELADA' };
    }

    const novoCheckin = utcDate(booking.arrival);
    const novoCheckout = utcDate(booking.departure);
    const datesChanged =
      isoDate(existing.checkin) !== booking.arrival ||
      isoDate(existing.checkout) !== booking.departure;

    if (!datesChanged) {
      await this.prisma.motorReservation.update({
        where: { id: existing.id },
        data: {
          hospede_nome: booking.hospede_nome,
          hospede_telefone: booking.hospede_telefone,
          hospede_email: booking.hospede_email,
          adultos: booking.adultos,
          criancas: booking.criancas,
          ...(booking.valor_total ? { valor_total: booking.valor_total } : {}),
        },
      });
      await this.prisma.motorReservationEvent.create({
        data: {
          reservation_id: existing.id,
          tipo: 'CONFIRMADA',
          autor: 'beds24',
          payload: { modified_time: booking.modified_time, detalhe: 'update da OTA sem mudanca de datas' },
        },
      });
      return { received: true, reservation_id: existing.id, status: existing.status };
    }

    // Datas mudaram na OTA: remarcacao com o protocolo de lock da Fase 1.
    try {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.$queryRaw`
          SELECT id FROM "motor_units"
          WHERE tenant_id = ${tenantId} AND room_type_id = ${existing.room_type_id} AND ativo = true
          FOR UPDATE
        `;
        const freeIds = await this.availability.freeUnitIds(
          tx,
          tenantId,
          existing.room_type_id,
          novoCheckin,
          novoCheckout,
          existing.id,
        );
        for (const unitId of freeIds) {
          try {
            await tx.motorReservation.update({
              where: { id: existing.id },
              data: {
                unit_id: unitId,
                checkin: novoCheckin,
                checkout: novoCheckout,
                ...(booking.valor_total ? { valor_total: booking.valor_total } : {}),
              },
            });
            await tx.motorReservationEvent.create({
              data: {
                reservation_id: existing.id,
                tipo: 'REMARCADA',
                autor: 'beds24',
                payload: {
                  modified_time: booking.modified_time,
                  de: { checkin: isoDate(existing.checkin), checkout: isoDate(existing.checkout) },
                  para: { checkin: booking.arrival, checkout: booking.departure },
                },
              },
            });
            return;
          } catch (error) {
            if (isExclusionViolation(error)) continue;
            throw error;
          }
        }
        throw new Error('sem unit livre nas novas datas');
      });
    } catch {
      // Mudanca da OTA que nao cabe localmente = divergencia real.
      await this.markDivergente(tenantId, 'canal.overbooking', {
        external_id: booking.external_id,
        detalhe: 'remarcacao da OTA sem unit livre nas novas datas',
        checkin: booking.arrival,
        checkout: booking.departure,
      });
      return { received: true, reservation_id: existing.id, status: existing.status };
    }

    void this.channelPush.enqueue(
      tenantId,
      existing.room_type_id,
      existing.checkin,
      existing.checkout,
    );
    void this.channelPush.enqueue(tenantId, existing.room_type_id, novoCheckin, novoCheckout);
    return { received: true, reservation_id: existing.id, status: existing.status };
  }

  // ── reserva nova ─────────────────────────────────────────────────────────

  private async createFromOta(
    tenantId: string,
    sync: any,
    booking: InboundBooking,
  ): Promise<InboundResult> {
    const roomMap = (sync.beds24_room_id_map ?? {}) as Record<string, number | string>;
    const roomTypeId = Object.keys(roomMap).find(
      (key) => Number(roomMap[key]) === booking.beds24_room_id,
    );
    if (!roomTypeId) {
      await this.markDivergente(tenantId, 'canal.divergencia', {
        external_id: booking.external_id,
        detalhe: `beds24 roomId ${booking.beds24_room_id} sem room_type no mapa`,
      });
      return { received: true, ignored: true };
    }

    const checkin = utcDate(booking.arrival);
    const checkout = utcDate(booking.departure);

    const outcome = await this.prisma.$transaction(async (tx: any) => {
      // MESMO protocolo de lock da Fase 1: FOR UPDATE serializa contra
      // holds do bot e reservas manuais nas mesmas units.
      await tx.$queryRaw`
        SELECT id FROM "motor_units"
        WHERE tenant_id = ${tenantId} AND room_type_id = ${roomTypeId} AND ativo = true
        FOR UPDATE
      `;
      const freeIds = await this.availability.freeUnitIds(tx, tenantId, roomTypeId, checkin, checkout);
      for (const unitId of freeIds) {
        const created = await this.tryCreate(tx, tenantId, roomTypeId, unitId, booking, 'CONFIRMADA');
        if (created) return { reservation: created, overbooked: false };
      }
      // Overbooking real vindo de fora: a reserva EXISTE na OTA e nao pode
      // ser perdida. Tenta TODAS as units com status HOLD — a constraint de
      // exclusao (que nao cruza com holds/blocks) e a rede: conflito apenas
      // com hold/block aceita a linha; conflito reserva x reserva rejeita.
      const units = await tx.motorUnit.findMany({
        where: { tenant_id: tenantId, room_type_id: roomTypeId, ativo: true },
        orderBy: { identificador: 'asc' },
      });
      for (const unit of units) {
        const created = await this.tryCreate(tx, tenantId, roomTypeId, unit.id, booking, 'HOLD');
        if (created) return { reservation: created, overbooked: true };
      }
      return { reservation: null, overbooked: true };
    });

    if (outcome.overbooked) {
      // Alerta PRIORITARIO: overbooking real, resolucao humana.
      await this.markDivergente(tenantId, 'canal.overbooking', {
        external_id: booking.external_id,
        origem: booking.origem,
        checkin: booking.arrival,
        checkout: booking.departure,
        hospede_nome: booking.hospede_nome,
        reservation_id: outcome.reservation?.id ?? null,
        prioridade: 'ALTA',
        ...(outcome.reservation
          ? {}
          : { detalhe: 'nenhuma unit aceitou a reserva (conflito reserva x reserva em todas)' }),
      });
    }
    if (outcome.reservation) {
      void this.channelPush.enqueue(tenantId, roomTypeId, checkin, checkout);
    }
    return {
      received: true,
      reservation_id: outcome.reservation?.id ?? null,
      status: outcome.reservation?.status ?? 'NAO_ALOCADA',
    };
  }

  /** create + evento CRIADA; violacao da constraint de exclusao -> null (proxima unit). */
  private async tryCreate(
    tx: any,
    tenantId: string,
    roomTypeId: string,
    unitId: string,
    booking: InboundBooking,
    status: 'CONFIRMADA' | 'HOLD',
  ): Promise<any | null> {
    try {
      const created = await tx.motorReservation.create({
        data: {
          tenant_id: tenantId,
          room_type_id: roomTypeId,
          unit_id: unitId,
          checkin: utcDate(booking.arrival),
          checkout: utcDate(booking.departure),
          status,
          origem: booking.origem,
          external_id: booking.external_id,
          hospede_nome: booking.hospede_nome,
          hospede_telefone: booking.hospede_telefone,
          hospede_email: booking.hospede_email,
          adultos: booking.adultos,
          criancas: booking.criancas,
          valor_total: booking.valor_total,
          valor_pago: 0,
          saldo_checkin: 0,
          forma_pagamento: 'OTA',
        },
      });
      await tx.motorReservationEvent.create({
        data: {
          reservation_id: created.id,
          tipo: 'CRIADA',
          autor: 'beds24',
          payload: {
            modified_time: booking.modified_time,
            external_id: booking.external_id,
            origem: booking.origem,
            ...(status === 'HOLD' ? { overbooking: true } : {}),
          },
        },
      });
      return created;
    } catch (error) {
      if (isExclusionViolation(error)) return null;
      throw error;
    }
  }

  // ── apoio ────────────────────────────────────────────────────────────────

  private async markDivergente(
    tenantId: string,
    evento: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.motorChannelSyncState.update({
      where: { tenant_id: tenantId },
      data: { status: 'DIVERGENTE' },
    });
    await this.botEvents.dispatch(tenantId, evento, payload);
  }

  private async touch(tenantId: string): Promise<void> {
    await this.prisma.motorChannelSyncState.update({
      where: { tenant_id: tenantId },
      data: { last_webhook_at: new Date() },
    });
  }

  /** Comparacao timing-safe via digest (iguala os tamanhos antes do compare). */
  private secretMatches(provided: string, expected: string): boolean {
    const a = crypto.createHash('sha256').update(String(provided ?? '')).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
  }
}
