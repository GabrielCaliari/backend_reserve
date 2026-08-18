import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChannelPushService } from '../../application/services/channel-push.service';

/**
 * Debounce da fila de push ao Beds24 (spec §3): drena a cada 30s — varias
 * mudancas de disponibilidade/preco no intervalo viram UM push em lote.
 */
@Injectable()
export class ChannelPushCronProvider {
  private readonly logger = new Logger(ChannelPushCronProvider.name);

  constructor(private readonly channelPush: ChannelPushService) {}

  @Cron('*/30 * * * * *')
  async drain(): Promise<void> {
    try {
      await this.channelPush.drain();
    } catch (error) {
      this.logger.error('Falha ao drenar a fila de push de canais', error as any);
    }
  }
}
