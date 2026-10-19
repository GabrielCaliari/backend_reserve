import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronSecretGuard } from '../../../reserve-client-portal/infrastructure/guards/cron-secret.guard';
import { MotorBotEventsRetryCronProvider } from '../providers/motor-bot-events-retry-cron.provider';

/** Gatilho HTTP do reenvio da outbox do motor, para hosts que nao executam @Cron. */
@ApiExcludeController()
@Controller('internal/cron')
@SkipThrottle()
export class MotorCronController {
  constructor(private readonly retryCron: MotorBotEventsRetryCronProvider) {}

  @Post('motor-sync')
  @HttpCode(200)
  @UseGuards(CronSecretGuard)
  async motorSync() {
    return this.retryCron.run();
  }
}
