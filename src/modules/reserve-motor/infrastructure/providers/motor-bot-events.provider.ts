import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

/**
 * Eventos motor -> bot (WF9 do N8N: hold.expirado,
 * pagamento.tardio.exception). Fase 1: fire-and-forget com log de erro.
 * TODO(arquitetura): ledger com retry (padrao bot_panel_actions) na
 * Fase 2 — divida registrada no plano do motor.
 */
@Injectable()
export class MotorBotEventsProvider {
  private readonly logger = new Logger(MotorBotEventsProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(tenantId: string, evento: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const config = await this.prisma.botIntegrationConfig.findUnique({
        where: { tenant_id: tenantId },
        select: { n8n_motor_webhook_url: true, active: true },
      });
      if (!config?.active || !config.n8n_motor_webhook_url) return;
      const response = await fetch(config.n8n_motor_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evento, tenant_id: tenantId, ...payload }),
      });
      if (!response.ok) {
        this.logger.error(`Webhook do motor respondeu ${response.status} (tenant ${tenantId}, ${evento})`);
      }
    } catch (error) {
      this.logger.error(`Falha no webhook do motor (tenant ${tenantId}, ${evento})`, error as any);
    }
  }
}
