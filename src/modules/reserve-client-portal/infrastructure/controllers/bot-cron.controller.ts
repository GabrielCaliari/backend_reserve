import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronSecretGuard } from '../guards/cron-secret.guard';
import { BotReconciliationCronProvider } from '../providers/bot-reconciliation-cron.provider';
import { BotEventIngestionService } from '../../application/services/bot-event-ingestion.service';

/** B3: roda as rotinas do bot sob demanda — necessario se o host nao executar @Cron. */
@ApiExcludeController()
@Controller('internal/cron')
@SkipThrottle()
export class BotCronController {
  constructor(
    private readonly reconciliation: BotReconciliationCronProvider,
    private readonly ingestion: BotEventIngestionService,
  ) {}

  @Post('bot-sync')
  @HttpCode(200)
  @UseGuards(CronSecretGuard)
  async botSync() {
    await this.reconciliation.reconcile();
    return this.ingestion.reprocessStuck();
  }
}
