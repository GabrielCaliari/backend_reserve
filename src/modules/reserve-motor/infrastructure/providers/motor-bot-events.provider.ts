import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AesEncryptionProvider } from '../../../reserve-client-portal/infrastructure/providers/aes-encryption.provider';

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Eventos motor -> bot (WF9 do N8N: hold.expirado, pagamento.tardio.exception).
 * Outbox (padrao bot_panel_actions): o evento e gravado ANTES da chamada, vai
 * assinado com HMAC (segredo do Canal B) e o cron reenvia os que falharem.
 * Nunca lanca — o motor nao pode falhar por causa do bot.
 */
@Injectable()
export class MotorBotEventsProvider {
  private readonly logger = new Logger(MotorBotEventsProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesEncryptionProvider,
  ) {}

  async dispatch(tenantId: string, evento: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const config = await this.prisma.botIntegrationConfig.findUnique({
        where: { tenant_id: tenantId },
        select: { n8n_motor_webhook_url: true, active: true },
      });
      if (!config?.active || !config.n8n_motor_webhook_url) return;
      const row = await this.prisma.motorBotEvent.create({
        data: { tenant_id: tenantId, evento, payload: payload as object, status: 'PENDING' },
      });
      await this.attempt(row.id, tenantId, evento, payload);
    } catch (error) {
      this.logger.error(`Falha ao registrar evento do motor (tenant ${tenantId}, ${evento})`, error as any);
    }
  }

  /** Reenvio de um evento que falhou (mesmo event_id) — usado pelo cron. */
  async retry(id: string): Promise<boolean> {
    const row = await this.prisma.motorBotEvent.findUnique({ where: { id } });
    if (!row) return false;
    return this.attempt(row.id, row.tenant_id, row.evento, (row.payload ?? {}) as Record<string, unknown>);
  }

  private async attempt(
    id: string,
    tenantId: string,
    evento: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const config = await this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } });
      if (!config?.n8n_motor_webhook_url) throw new Error('url do webhook do motor ausente');
      if (!config.panel_webhook_secret_enc) throw new Error('segredo do canal B ausente');

      // O corpo e serializado UMA vez: a assinatura e do texto exato que trafega.
      const body = JSON.stringify({
        event_id: id,
        evento,
        tenant_id: config.bot_tenant_ref ?? tenantId,
        ...payload,
      });
      const signature = crypto
        .createHmac('sha256', this.aes.decrypt(config.panel_webhook_secret_enc))
        .update(body)
        .digest('hex');

      const response = await axios.post(config.n8n_motor_webhook_url, body, {
        timeout: WEBHOOK_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json', 'X-Reserve-Signature': signature },
        // Sem isto o axios re-serializaria a string e a assinatura deixaria de bater.
        transformRequest: [(data) => data],
        validateStatus: () => true,
      });
      if (response.status >= 400) throw new Error(`HTTP ${response.status}`);

      await this.prisma.motorBotEvent.update({
        where: { id },
        data: { status: 'SENT', last_error: null, last_attempt_at: new Date() },
      });
      return true;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.logger.warn(`Evento do motor nao entregue (tenant ${tenantId}, ${evento}, id=${id}): ${message}`);
      await this.prisma.motorBotEvent
        .update({
          where: { id },
          data: { status: 'FAILED', attempts: { increment: 1 }, last_error: message, last_attempt_at: new Date() },
        })
        .catch(() => undefined);
      return false;
    }
  }
}
