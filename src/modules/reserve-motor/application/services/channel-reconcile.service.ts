import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { isoDate } from '../../domain/constants/motor.constants';
import { MotorChannelNotConnectedError } from '../../domain/errors/channel.errors';
import { Beds24ApiProvider } from '../../infrastructure/providers/beds24-api.provider';
import { MotorBotEventsProvider } from '../../infrastructure/providers/motor-bot-events.provider';
import { ChannelInboundService, InboundBooking } from './channel-inbound.service';

/** Teto de paginas do GET /bookings — protege os creditos da janela de 5min. */
const MAX_PAGES = 20;

interface Beds24BookingsResponse {
  data?: unknown[];
  pages?: { nextPageExists?: boolean };
}

export interface ReconcileResult {
  corrigidas: number;
}

/**
 * Reconciliacao diaria com o Beds24 (spec §3/§11): webhook perdido NAO pode
 * virar overbooking silencioso. Por tenant conectado, GET /bookings
 * ?modifiedSince=<last_reconcile_at> -> compara com motor_reservations por
 * external_id -> divergencia corrige o local pela MESMA rotina do
 * ChannelInboundService (injetado — logica nao duplicada), marca o sync
 * state DIVERGENTE e alerta a equipe via evento canal.divergencia.
 * Erro de API (rate limit incluso) e logado sem derrubar os demais tenants.
 */
@Injectable()
export class ChannelReconcileService {
  private readonly logger = new Logger(ChannelReconcileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly beds24: Beds24ApiProvider,
    private readonly inbound: ChannelInboundService,
    private readonly botEvents: MotorBotEventsProvider,
  ) {}

  /**
   * Roda a reconciliacao de todos os tenants conectados (sync state com
   * refresh token e status != DESCONECTADO). `apenasReforcados: true` e o
   * modo do cutover (cron das 15h30): so tenants com reconcile_2x ligado.
   */
  async reconcileConnected(apenasReforcados = false): Promise<void> {
    const states = await this.prisma.motorChannelSyncState.findMany({
      where: {
        refresh_token_encrypted: { not: null },
        status: { not: 'DESCONECTADO' },
        ...(apenasReforcados ? { reconcile_2x: true } : {}),
      },
    });
    for (const state of states) {
      try {
        await this.reconcileTenant(state.tenant_id);
      } catch (error) {
        // Rate limit ou API fora: loga e segue para o proximo tenant — a
        // proxima janela de reconciliacao cobre o buraco.
        this.logger.error(
          `Reconciliacao beds24 falhou (tenant ${state.tenant_id}): ${(error as Error)?.message ?? error}`,
        );
      }
    }
  }

  /** Reconciliacao de um tenant (tambem chamada sob demanda pela API admin). */
  async reconcileTenant(tenantId: string): Promise<ReconcileResult> {
    const sync = await this.prisma.motorChannelSyncState.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!sync?.refresh_token_encrypted || sync.status === 'DESCONECTADO') {
      throw new MotorChannelNotConnectedError();
    }

    // Marca ANTES da chamada: mudanca que acontecer durante a rodada entra
    // na proxima janela de modifiedSince em vez de se perder.
    const startedAt = new Date();
    const bookings = await this.fetchModified(tenantId, sync.last_reconcile_at ?? null);

    let corrigidas = 0;
    const externalIds: string[] = [];
    for (const raw of bookings) {
      const booking = this.inbound.normalizeBooking(raw as Record<string, unknown>);
      if (!booking) continue;
      const local = await this.prisma.motorReservation.findFirst({
        where: { tenant_id: tenantId, external_id: booking.external_id },
      });
      if (!this.isDivergent(local, booking)) continue;
      const result = await this.inbound.applyBooking(tenantId, sync, booking, { forcar: true });
      if (result.ignored !== true) {
        corrigidas += 1;
        externalIds.push(booking.external_id);
      }
    }

    if (corrigidas > 0) {
      await this.prisma.motorChannelSyncState.update({
        where: { tenant_id: tenantId },
        data: { status: 'DIVERGENTE' },
      });
      await this.botEvents.dispatch(tenantId, 'canal.divergencia', {
        corrigidas,
        external_ids: externalIds,
        detalhe: 'reconciliacao corrigiu reservas locais divergentes do beds24',
      });
    }

    await this.prisma.motorChannelSyncState.update({
      where: { tenant_id: tenantId },
      data: { last_reconcile_at: startedAt },
    });
    return { corrigidas };
  }

  // ── apoio ────────────────────────────────────────────────────────────────

  /**
   * Divergencia = reserva ativa na OTA que nao existe localmente (webhook
   * perdido), cancelada la mas ativa aqui (ou vice-versa), ou datas
   * diferentes. Convergente nao reaplica nada (rodada sa e silenciosa).
   */
  private isDivergent(local: any, booking: InboundBooking): boolean {
    if (!local) return !booking.cancelled;
    if (booking.cancelled) return local.status !== 'CANCELADA';
    return (
      local.status === 'CANCELADA' ||
      isoDate(local.checkin) !== booking.arrival ||
      isoDate(local.checkout) !== booking.departure
    );
  }

  /** GET /bookings paginado; modifiedSince so entra quando ja houve rodada. */
  private async fetchModified(tenantId: string, since: Date | null): Promise<unknown[]> {
    const baseParams: string[] = [];
    if (since) baseParams.push(`modifiedSince=${encodeURIComponent(this.formatSince(since))}`);

    const all: unknown[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const params = [...baseParams, ...(page > 1 ? [`page=${page}`] : [])];
      const path = `/bookings${params.length > 0 ? `?${params.join('&')}` : ''}`;
      const body = await this.beds24.request<Beds24BookingsResponse | unknown[]>(
        tenantId,
        'GET',
        path,
      );
      const data = Array.isArray(body) ? body : (body?.data ?? []);
      if (Array.isArray(data)) all.push(...data);
      if (Array.isArray(body) || body?.pages?.nextPageExists !== true) break;
    }
    return all;
  }

  /** Formato aceito pelo Beds24: YYYY-MM-DD HH:MM:SS em UTC. */
  private formatSince(since: Date): string {
    return since.toISOString().slice(0, 19).replace('T', ' ');
  }
}
