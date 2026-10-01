import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotPanelActionProvider } from './bot-panel-action.provider';

const MAX_ATTEMPTS = 5;

/**
 * Contrato v2 §5.3: a acao humana e gravada em bot_panel_actions antes de ir ao
 * bot; este cron reenvia as FAILED com attempts < 5 (as demais ficam visiveis
 * por status). send_message nunca e reenviada.
 */
@Injectable()
export class BotReconciliationCronProvider {
  private readonly logger = new Logger(BotReconciliationCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botPanelActions: BotPanelActionProvider,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcile(): Promise<void> {
    // Canal B do contrato v2. send_message fica de fora: reenviar uma mensagem
    // minutos depois, fora de contexto, e pior do que perde-la.
    const acoes = await this.prisma.botPanelAction.findMany({
      where: { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS }, action: { not: 'send_message' } },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    for (const acao of acoes) {
      await this.botPanelActions.retry(acao.id);
    }
  }
}
