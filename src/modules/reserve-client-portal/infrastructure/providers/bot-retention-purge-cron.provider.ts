import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotRetentionService } from '../../application/services/bot-retention.service';
import { Prisma } from '../../../../generated/prisma/client';

/**
 * §5.8: daily purge of conversation content (BotMessage) and ingestion
 * ledger payloads older than each tenant's retention_days (default 365).
 * v29: bot_issues sao anonimizadas (numero e conteudo), bot_feedbacks e
 * motor_bot_events terminados (SENT/FAILED) sao apagados pelo mesmo corte.
 * Never touches FunnelEvent — the audit trail is explicitly out of scope for
 * this purge (§5.8 only asks for conversation content, not funnel history).
 */
@Injectable()
export class BotRetentionPurgeCronProvider {
  private readonly logger = new Logger(BotRetentionPurgeCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retentionService: BotRetentionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge(): Promise<void> {
    const tenantsWithBot = await this.prisma.botIntegrationConfig.findMany({
      select: { tenant_id: true },
    });

    for (const { tenant_id: tenantId } of tenantsWithBot) {
      const retentionDays = await this.retentionService.getRetentionDays(tenantId);
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const [deletedMessages, purgedLedgerRows, purgedIssues, deletedFeedbacks, deletedMotorEvents] = await Promise.all([
        this.prisma.botMessage.deleteMany({
          where: { tenant_id: tenantId, ocorrido_em: { lt: cutoff } },
        }),
        this.prisma.botIngestionEvent.updateMany({
          where: { tenant_id: tenantId, received_at: { lt: cutoff }, payload: { not: {} } },
          data: { payload: {} },
        }),
        // Erros do bot: mantem a linha (contagem por codigo/categoria) e tira o
        // numero e todo o conteudo da conversa. So toca linhas ainda nao purgadas.
        this.prisma.botIssue.updateMany({
          where: {
            tenant_id: tenantId,
            ocorrido_em: { lt: cutoff },
            OR: [
              { numero_contato: { not: null } },
              { mensagem: { not: null } },
              { mensagem_hospede: { not: null } },
              { resposta_bot: { not: null } },
              { contexto: { not: Prisma.DbNull } },
            ],
          },
          data: {
            numero_contato: null,
            mensagem: null,
            mensagem_hospede: null,
            resposta_bot: null,
            contexto: Prisma.DbNull,
          },
        }),
        // Feedback e texto livre do hospede: apaga.
        this.prisma.botFeedback.deleteMany({
          where: { tenant_id: tenantId, ocorrido_em: { lt: cutoff } },
        }),
        // Outbox motor -> bot: payload traz contato_whatsapp/hospede_nome. Apaga o
        // que ja terminou (SENT/FAILED); PENDING fica para o reenvio decidir.
        this.prisma.motorBotEvent.deleteMany({
          where: { tenant_id: tenantId, status: { in: ['SENT', 'FAILED'] }, created_at: { lt: cutoff } },
        }),
      ]);

      const total =
        deletedMessages.count + purgedLedgerRows.count + purgedIssues.count + deletedFeedbacks.count + deletedMotorEvents.count;
      if (total > 0) {
        this.logger.log(
          `Purged tenant ${tenantId}: ${deletedMessages.count} messages, ${purgedLedgerRows.count} ledger payloads, ` +
            `${purgedIssues.count} issues anonymized, ${deletedFeedbacks.count} feedbacks, ` +
            `${deletedMotorEvents.count} motor events (retention_days=${retentionDays})`,
        );
      }
    }
  }
}
