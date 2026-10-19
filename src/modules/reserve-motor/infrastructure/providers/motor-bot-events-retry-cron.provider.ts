import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { MotorBotEventsProvider } from './motor-bot-events.provider';

const MAX_ATTEMPTS = 5;
const BATCH = 200;

/** Reenvia eventos do motor que falharam (outbox motor_bot_events). */
@Injectable()
export class MotorBotEventsRetryCronProvider {
  private readonly logger = new Logger(MotorBotEventsRetryCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: MotorBotEventsProvider,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<{ retried: number }> {
    const rows = await this.prisma.motorBotEvent.findMany({
      where: { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
      orderBy: { created_at: 'asc' },
      take: BATCH,
      select: { id: true },
    });
    for (const row of rows) {
      try {
        await this.events.retry(row.id);
      } catch (error) {
        this.logger.warn(`Reenvio do evento ${row.id} falhou: ${error}`);
      }
    }
    return { retried: rows.length };
  }
}
