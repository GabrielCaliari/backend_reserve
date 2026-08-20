import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GuestStatusService } from '../../application/services/guest-status.service';

/**
 * Transicao diaria contato -> hospede (e a volta no checkout). Roda de manha
 * cedo, antes do horario tipico de check-in; o dia da confirmacao em si e
 * coberto pelo evento `reserva.confirmada` que o motor manda ao bot.
 */
@Injectable()
export class GuestStatusCronProvider {
  private readonly logger = new Logger(GuestStatusCronProvider.name);

  constructor(private readonly guestStatus: GuestStatusService) {}

  @Cron('0 6 * * *')
  async sync(): Promise<void> {
    try {
      await this.guestStatus.syncAll();
    } catch (error) {
      this.logger.error('sync diario de hospedes falhou', error as Error);
    }
  }
}
