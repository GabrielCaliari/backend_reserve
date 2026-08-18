import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import { Beds24ApiProvider } from '../../infrastructure/providers/beds24-api.provider';
import { ConnectChannelAdminDto } from '../dtos/channel-admin.dto';

/**
 * Token de injecao da reconciliacao sob demanda. O ChannelReconcileService
 * (Task 5) nasce em outra branch; este branch compila sozinho com a porta
 * tipada abaixo e o merge liga as pontas registrando no modulo:
 * `{ provide: CHANNEL_RECONCILE, useExisting: ChannelReconcileService }`.
 */
export const CHANNEL_RECONCILE = 'CHANNEL_RECONCILE';

export interface ChannelReconcilePort {
  reconcileTenant(tenantId: string): Promise<{ corrigidas: number }>;
}

interface SyncStateRow {
  status: string;
  reconcile_2x: boolean;
  beds24_property_id: string | null;
  beds24_room_id_map: unknown;
  last_push_at: Date | null;
  last_webhook_at: Date | null;
  last_reconcile_at: Date | null;
  refresh_token_encrypted: string | null;
}

/**
 * API admin de canais (spec §5, tela /dashboard/motor/canais). Toda leitura
 * passa por toSafeShape — refresh_token_encrypted e webhook_secret NUNCA
 * saem daqui (mesmo precedente do BotIntegrationConfigService: o segredo do
 * webhook e devolvido UMA unica vez, na resposta do connect).
 */
@Injectable()
export class ChannelAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beds24: Beds24ApiProvider,
    @Optional() @Inject(CHANNEL_RECONCILE) private readonly reconcile?: ChannelReconcilePort,
  ) {}

  /** Estado da sincronizacao + itens da fila parados em ERRO. */
  async overview(tenantId: string) {
    const sync = await this.prisma.motorChannelSyncState.findUnique({
      where: { tenant_id: tenantId },
    });
    const erros = await this.prisma.motorChannelPushQueue.findMany({
      where: { tenant_id: tenantId, status: 'ERRO' },
      orderBy: { updated_at: 'desc' },
    });
    return {
      ...this.toSafeShape(sync),
      fila_erros: erros.map((item: any) => ({
        id: item.id,
        room_type_id: item.room_type_id,
        range_inicio: item.range_inicio,
        range_fim: item.range_fim,
        attempts: item.attempts,
      })),
    };
  }

  /**
   * Conecta o tenant ao Beds24 (invite code -> refresh token cifrado, feito
   * pelo provider) e gera o webhook_secret. O segredo e gravado no sync
   * state e devolvido AQUI, uma unica vez — nenhuma leitura posterior o
   * expoe de novo.
   */
  async connect(tenantId: string, dto: ConnectChannelAdminDto) {
    await this.beds24.connect(tenantId, dto.invite_code);
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const sync = await this.prisma.motorChannelSyncState.update({
      where: { tenant_id: tenantId },
      data: {
        beds24_property_id: dto.beds24_property_id,
        webhook_secret: webhookSecret,
        status: 'OK',
      },
    });
    return { ...this.toSafeShape(sync), webhook_secret: webhookSecret };
  }

  /**
   * Grava o mapa room_type_id -> beds24 roomId. Todo room_type precisa
   * pertencer ao tenant (404 se nao) e todo roomId precisa ser numerico.
   */
  async saveRoomMap(tenantId: string, map: Record<string, number | string>) {
    const roomTypeIds = Object.keys(map ?? {});
    for (const roomTypeId of roomTypeIds) {
      const roomId = Number(map[roomTypeId]);
      if (!Number.isFinite(roomId) || roomId <= 0) {
        throw new MotorValidationError(`beds24 roomId invalido para o room_type ${roomTypeId}`);
      }
    }
    if (roomTypeIds.length > 0) {
      const found = await this.prisma.motorRoomType.findMany({
        where: { tenant_id: tenantId, id: { in: roomTypeIds } },
        select: { id: true },
      });
      const foundIds = new Set(found.map((rt: { id: string }) => rt.id));
      const missing = roomTypeIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new MotorNotFoundError(`room_type(s) fora do tenant: ${missing.join(', ')}`);
      }
    }
    const sync = await this.prisma.motorChannelSyncState.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, beds24_room_id_map: map },
      update: { beds24_room_id_map: map },
    });
    return this.toSafeShape(sync);
  }

  /** Liga/desliga a reconciliacao reforcada do cutover (roda tambem as 15h30). */
  async setReconcile2x(tenantId: string, enabled: boolean) {
    const sync = await this.prisma.motorChannelSyncState.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, reconcile_2x: enabled },
      update: { reconcile_2x: enabled },
    });
    return this.toSafeShape(sync);
  }

  /** Reconciliacao sob demanda, delegada a porta CHANNEL_RECONCILE. */
  async reconcileNow(tenantId: string): Promise<{ corrigidas: number }> {
    if (!this.reconcile) {
      throw new ServiceUnavailableException(
        'Reconciliacao sob demanda indisponivel: ChannelReconcileService nao registrado',
      );
    }
    return this.reconcile.reconcileTenant(tenantId);
  }

  /**
   * Shape seguro: NUNCA inclui refresh_token_encrypted nem webhook_secret.
   * Sem sync state o canal e reportado como DESCONECTADO (estado zero da
   * tela de canais, nao um 404).
   */
  private toSafeShape(sync: SyncStateRow | null) {
    return {
      status: sync ? sync.status : 'DESCONECTADO',
      conectado: Boolean(sync?.refresh_token_encrypted),
      reconcile_2x: sync?.reconcile_2x ?? false,
      beds24_property_id: sync?.beds24_property_id ?? null,
      beds24_room_id_map: (sync?.beds24_room_id_map as Record<string, number | string> | null) ?? null,
      last_push_at: sync?.last_push_at ?? null,
      last_webhook_at: sync?.last_webhook_at ?? null,
      last_reconcile_at: sync?.last_reconcile_at ?? null,
    };
  }
}
