import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotEventV2Dto } from '../dtos/bot-event.dto';
import { BotEventProcessorService } from './bot-event-processor.service';

export const STUCK_AFTER_MS = 5 * 60_000;
export const MAX_PROJECTION_ATTEMPTS = 5;
const STUCK_STATUSES = ['FAILED', 'RECEIVED'];
const REPROCESS_BATCH = 500;

/**
 * POST /api/ingest/bot-events (contrato v2 §3). The ledger insert commits
 * even if the processor later fails — failure must be recorded, not rolled
 * back into invisibility, so a transaction is deliberately NOT used across
 * the ledger-create + processor-run pair.
 *
 * Idempotency: a duplicate event_id for the same tenant hits the ledger's
 * unique (tenant_id, event_id) constraint (P2002) and is counted as
 * duplicated. A duplicate that stayed FAILED/RECEIVED is projected again (B2),
 * up to MAX_PROJECTION_ATTEMPTS.
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
   * event_id repetido: conta como duplicado; se ficou FAILED/RECEIVED e reprojetado (B2).
   * Falha de projecao: marca FAILED e segue; o reenvio ou o cron reprojetam. Erro de banco no ledger: sobe, vira
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
        if (!this.isUniqueConstraintError(error)) throw error;
        duplicated += 1;
        // B2: o bot reenvia o lote quando algo deu errado do lado de ca. Se o
        // evento ficou preso (FAILED ou RECEIVED), o reenvio e a chance de projetar.
        const existing = await this.prisma.botIngestionEvent.findUnique({
          where: { tenant_id_event_id: { tenant_id: tenantId, event_id: event.event_id } },
          select: { status: true, attempts: true },
        });
        if (existing && existing.status !== 'PROCESSED' && existing.attempts < MAX_PROJECTION_ATTEMPTS) {
          await this.project(tenantId, event, existing.attempts);
        }
        continue;
      }
      await this.project(tenantId, event, 0);
    }

    return { received: events.length, duplicated };
  }

  /** B2: rotina do cron — reprojeta eventos presos ha mais de 5 min, ate 5 tentativas. */
  async reprocessStuck(now = new Date()): Promise<{ reprocessed: number }> {
    const rows = await this.prisma.botIngestionEvent.findMany({
      where: {
        status: { in: STUCK_STATUSES },
        attempts: { lt: MAX_PROJECTION_ATTEMPTS },
        received_at: { lt: new Date(now.getTime() - STUCK_AFTER_MS) },
      },
      orderBy: { occurred_at: 'asc' },
      take: REPROCESS_BATCH,
      select: { tenant_id: true, event_id: true, attempts: true, payload: true },
    });
    let reprocessed = 0;
    for (const row of rows) {
      if (await this.project(row.tenant_id, row.payload as unknown as BotEventV2Dto, row.attempts)) reprocessed += 1;
    }
    return { reprocessed };
  }

  /** B2: contagem visivel para a Reserve (vai no GET da integracao). */
  async countStuck(tenantId: string, now = new Date()): Promise<number> {
    return this.prisma.botIngestionEvent.count({
      where: {
        tenant_id: tenantId,
        status: { in: STUCK_STATUSES },
        received_at: { lt: new Date(now.getTime() - STUCK_AFTER_MS) },
      },
    });
  }

  /**
   * Reivindica o evento incrementando `attempts` so se ninguem mexeu nele desde
   * a leitura (lock otimista): o cron e um reenvio do bot nunca projetam o
   * mesmo evento ao mesmo tempo. Devolve true se projetou com sucesso.
   */
  private async project(tenantId: string, event: BotEventV2Dto, seenAttempts: number): Promise<boolean> {
    const key = { tenant_id: tenantId, event_id: event.event_id };
    const claim = await this.prisma.botIngestionEvent.updateMany({
      where: { ...key, attempts: seenAttempts, status: { not: 'PROCESSED' } },
      data: { attempts: { increment: 1 } },
    });
    if (claim.count !== 1) return false;

    const where = { tenant_id_event_id: key };
    try {
      await this.processor.process(tenantId, event);
      await this.prisma.botIngestionEvent.update({
        where,
        data: { status: 'PROCESSED', processed_at: new Date(), error_message: null },
      });
      return true;
    } catch (error) {
      this.logger.error(`Bot event projection failed (tenant=${tenantId}, event=${event.event_id}): ${error}`);
      await this.prisma.botIngestionEvent.update({
        where,
        data: { status: 'FAILED', error_message: String((error as Error)?.message ?? error) },
      });
      return false;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return Boolean(error) && typeof error === 'object' && (error as { code?: string }).code === 'P2002';
  }
}
