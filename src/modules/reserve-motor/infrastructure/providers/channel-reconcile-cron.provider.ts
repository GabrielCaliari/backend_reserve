import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChannelReconcileService } from '../../application/services/channel-reconcile.service';

/**
 * Cinto de seguranca da sincronizacao (spec §3/§11): reconciliacao diaria na
 * madrugada (3h30) para todo tenant conectado, e rodada extra as 15h30 no
 * modo reforcado do cutover (sync state com reconcile_2x ligado).
 */
@Injectable()
export class ChannelReconcileCronProvider {
  private readonly logger = new Logger(ChannelReconcileCronProvider.name);

  constructor(private readonly reconcile: ChannelReconcileService) {}

  @Cron('30 3 * * *')
  async madrugada(): Promise<void> {
    try {
      await this.reconcile.reconcileConnected(false);
    } catch (error) {
      this.logger.error('Falha na reconciliacao diaria de canais', error as any);
    }
  }

  @Cron('30 15 * * *')
  async reforco(): Promise<void> {
    try {
      await this.reconcile.reconcileConnected(true);
    } catch (error) {
      this.logger.error('Falha na reconciliacao reforcada de canais', error as any);
    }
  }
}
