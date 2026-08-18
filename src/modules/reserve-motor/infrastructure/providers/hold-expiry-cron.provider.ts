import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HoldService } from '../../application/services/hold.service';

/** Hold prendendo estoque e risco da spec §11 — expiracao a cada minuto. */
@Injectable()
export class HoldExpiryCronProvider {
  constructor(private readonly holdService: HoldService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expire(): Promise<void> {
    await this.holdService.expireDue();
  }
}
