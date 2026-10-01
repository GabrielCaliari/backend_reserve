import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AesEncryptionProvider } from './aes-encryption.provider';
import { EBotContactStatus } from '../../../../generated/prisma/enums';

const WEBHOOK_TIMEOUT_MS = 5000;

export type PanelAction =
  | 'move_stage'
  | 'return_to_bot'
  | 'pause_bot'
  | 'extend_hold'
  | 'mark_lost'
  | 'send_message'
  | 'apply_config';

export interface PanelActionInput {
  phone?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
}

export interface PanelActionResult {
  ok: boolean;
  state: string | null;
}

/**
 * Canal B do contrato v2 (§5): acoes do humano no painel -> bot. A acao vira
 * uma linha em bot_panel_actions ANTES da chamada (outbox): se o bot estiver
 * fora do ar, a acao do humano ja valeu no painel e o cron reconcilia.
 * Nunca lanca — quem chama decide o que fazer com `ok: false`.
 */
@Injectable()
export class BotPanelActionProvider {
  private readonly logger = new Logger(BotPanelActionProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesEncryptionProvider,
  ) {}

  async dispatch(tenantId: string, action: PanelAction, input: PanelActionInput = {}): Promise<PanelActionResult> {
    let row: { id: string };
    try {
      row = await this.prisma.botPanelAction.create({
        data: {
          tenant_id: tenantId,
          action,
          phone: input.phone ?? null,
          actor_id: input.actorId ?? null,
          payload: (input.payload ?? {}) as object,
          status: 'PENDING',
        },
      });
    } catch (error) {
      this.logger.warn(`Nao foi possivel registrar a acao ${action} (tenant=${tenantId}): ${error}`);
      return { ok: false, state: null };
    }
    return this.attempt(row.id, tenantId, action, input);
  }

  /** Reenvio de uma acao que falhou — usado pelo cron de reconciliacao. */
  async retry(actionId: string): Promise<PanelActionResult> {
    const row = await this.prisma.botPanelAction.findUnique({ where: { id: actionId } });
    if (!row) return { ok: false, state: null };
    return this.attempt(row.id, row.tenant_id, row.action as PanelAction, {
      phone: row.phone,
      actorId: row.actor_id,
      payload: (row.payload ?? {}) as Record<string, unknown>,
    });
  }

  private async attempt(
    actionId: string,
    tenantId: string,
    action: PanelAction,
    input: PanelActionInput,
  ): Promise<PanelActionResult> {
    try {
      const config = await this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } });
      if (!config?.n8n_panel_webhook_url || !config.panel_webhook_secret_enc) {
        throw new Error('canal reverso nao configurado (url ou segredo ausente)');
      }

      // O corpo e serializado UMA vez: a assinatura e do texto exato que trafega.
      const body = JSON.stringify({
        action,
        tenant_id: config.bot_tenant_ref ?? tenantId,
        phone: input.phone ?? null,
        actor_id: input.actorId ?? null,
        payload: input.payload ?? {},
      });
      const signature = crypto
        .createHmac('sha256', this.aes.decrypt(config.panel_webhook_secret_enc))
        .update(body)
        .digest('hex');

      const response = await axios.post(config.n8n_panel_webhook_url, body, {
        timeout: WEBHOOK_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json', 'X-Reserve-Signature': signature },
        // Sem isto o axios re-serializaria a string e a assinatura deixaria de bater.
        transformRequest: [(data) => data],
      });

      const state = typeof response.data?.state === 'string' ? response.data.state : null;
      await this.prisma.botPanelAction.update({
        where: { id: actionId },
        data: { status: 'SENT', response_state: state, last_error: null, last_attempt_at: new Date() },
      });

      // O bot devolve o estado do contato depois da acao (§5.2): aplica na hora,
      // sem esperar o evento de eco chegar pelo Canal A.
      if (input.phone && state && state in EBotContactStatus) {
        await this.prisma.botContact.updateMany({
          where: { tenant_id: tenantId, numero_contato: input.phone },
          data: { status_bot: state as EBotContactStatus },
        });
      }
      return { ok: true, state };
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.logger.warn(`Acao ${action} nao entregue ao bot (tenant=${tenantId}, acao=${actionId}): ${message}`);
      await this.prisma.botPanelAction
        .update({
          where: { id: actionId },
          data: { status: 'FAILED', attempts: { increment: 1 }, last_error: message, last_attempt_at: new Date() },
        })
        .catch(() => undefined);
      return { ok: false, state: null };
    }
  }
}
