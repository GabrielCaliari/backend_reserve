import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotEventIngestionService } from '../../application/services/bot-event-ingestion.service';

/** B2 da auditoria 06/10: eventos do Canal A presos no ledger voltam a ser projetados. */
@Injectable()
export class BotIngestionReprocessCronProvider {
  private readonly logger = new Logger(BotIngestionReprocessCronProvider.name);

  constructor(private readonly ingestion: BotEventIngestionService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async run(): Promise<void> {
    const { reprocessed } = await this.ingestion.reprocessStuck();
    if (reprocessed > 0) this.logger.log(`Eventos do bot reprojetados: ${reprocessed}`);
  }
}
