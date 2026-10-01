import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotEventV2Dto } from '../dtos/bot-event.dto';
import { BotEventProcessorService } from './bot-event-processor.service';

/**
 * POST /api/ingest/bot-events (contrato v2 §3). The ledger insert commits
 * even if the processor later fails — failure must be recorded, not rolled
 * back into invisibility, so a transaction is deliberately NOT used across
 * the ledger-create + processor-run pair.
 *
 * Idempotency: a duplicate event_id for the same tenant hits the ledger's
 * unique (tenant_id, event_id) constraint (P2002) and is counted as
 * duplicated — the processor never runs a second time for it.
 */
@Injectable()
export class BotEventIngestionService {
  private readonly logger = new Logger(BotEventIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: BotEventProcessorService,
  ) {}

  /**
   * Contrato v2 §3: lote de ate 250 eventos. Cada evento vai para o ledger
   * (append-only) e so depois e projetado. Processa em ordem de occurred_at
   * porque o estado do contato e "o ultimo evento dele" — um lote embaralhado
   * nao pode fazer um evento antigo sobrescrever um novo.
   *
   * event_id repetido: conta como duplicado, nunca reprocessa (§3.3).
   * Falha de projecao: marca FAILED e segue — reenviar o lote nao ajudaria,
   * porque o event_id ja esta no ledger. Erro de banco no ledger: sobe, vira
   * 5xx, e o bot reenvia o lote inteiro no minuto seguinte (seguro: idempotente).
   */
  async ingestBatch(
    tenantId: string,
    events: BotEventV2Dto[],
  ): Promise<{ received: number; duplicated: number }> {
    const ordered = [...events].sort(
      (a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at),
    );
    let duplicated = 0;

    for (const event of ordered) {
      try {
        await this.prisma.botIngestionEvent.create({
          data: {
            tenant_id: tenantId,
            event_id: event.event_id,
            event_type: event.type,
            occurred_at: new Date(event.occurred_at),
            payload: event as object,
            status: 'RECEIVED',
          },
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          duplicated += 1;
          continue;
        }
        throw error;
      }

      const where = { tenant_id_event_id: { tenant_id: tenantId, event_id: event.event_id } };
      try {
        await this.processor.process(tenantId, event);
        await this.prisma.botIngestionEvent.update({
          where,
          data: { status: 'PROCESSED', processed_at: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `Bot event projection failed (tenant=${tenantId}, event=${event.event_id}): ${error}`,
        );
        await this.prisma.botIngestionEvent.update({
          where,
          data: { status: 'FAILED', error_message: String((error as Error)?.message ?? error) },
        });
      }
    }

    return { received: events.length, duplicated };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return Boolean(error) && typeof error === 'object' && (error as { code?: string }).code === 'P2002';
  }
}
