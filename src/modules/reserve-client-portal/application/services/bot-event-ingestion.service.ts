import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotEventDto } from '../dtos/bot-event.dto';
import { BotEventProcessorService } from './bot-event-processor.service';

export interface IBotEventIngestResult {
  status: 202 | 500;
}

/**
 * POST /api/ingest/bot-events (§5.6, Decisao 14). The ledger insert commits
 * even if the processor later fails — failure must be recorded, not rolled
 * back into invisibility, so a transaction is deliberately NOT used across
 * the ledger-create + processor-run pair.
 *
 * Idempotency: a duplicate event_id for the same tenant hits the ledger's
 * unique (tenant_id, event_id) constraint (P2002) and is a silent 202
 * no-op — the processor never runs a second time for it.
 */
@Injectable()
export class BotEventIngestionService {
  private readonly logger = new Logger(BotEventIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: BotEventProcessorService,
  ) {}

  async ingest(tenantId: string, dto: BotEventDto): Promise<IBotEventIngestResult> {
    try {
      await this.prisma.botIngestionEvent.create({
        data: {
          tenant_id: tenantId,
          event_id: dto.event_id,
          event_type: dto.event_type,
          occurred_at: new Date(dto.occurred_at),
          payload: dto.payload as object,
          status: 'RECEIVED',
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        // Duplicate event_id for this tenant — already received, never
        // reprocessed. Idempotent no-op.
        return { status: 202 };
      }
      this.logger.error(`Failed to write bot ingestion ledger row: ${error}`);
      return { status: 500 };
    }

    try {
      await this.processor.process(tenantId, dto);
      await this.prisma.botIngestionEvent.update({
        where: { tenant_id_event_id: { tenant_id: tenantId, event_id: dto.event_id } },
        data: { status: 'PROCESSED', processed_at: new Date() },
      });
      return { status: 202 };
    } catch (error) {
      this.logger.error(`Bot event processing failed (tenant=${tenantId}, event=${dto.event_id}): ${error}`);
      await this.prisma.botIngestionEvent.update({
        where: { tenant_id_event_id: { tenant_id: tenantId, event_id: dto.event_id } },
        data: { status: 'FAILED', error_message: String((error as Error)?.message ?? error) },
      });
      return { status: 500 };
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return Boolean(error) && typeof error === 'object' && (error as { code?: string }).code === 'P2002';
  }
}
