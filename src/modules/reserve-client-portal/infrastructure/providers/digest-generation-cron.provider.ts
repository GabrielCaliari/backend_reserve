import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { DigestService } from '../../application/services/digest.service';

/**
 * §3.7.1: gera o rascunho do resumo quinzenal às 06:00 nos dias 1 e 16.
 * "Automação monta, humano assina" — nunca publica nem envia notificação;
 * isso é responsabilidade exclusiva do fluxo de revisão/publicação (Task 3).
 */
@Injectable()
export class DigestGenerationCronProvider {
  private readonly logger = new Logger(DigestGenerationCronProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly digestService: DigestService,
  ) {}

  @Cron('0 6 1,16 * *')
  async generateAll(): Promise<void> {
    this.logger.log('Starting bi-monthly digest generation');

    const { periodStart, periodEnd } = this.computeWindow();

    const clients = await this.prisma.hotelClient.findMany({
      where: { is_active: true, tenant_id: { not: null } },
      select: { id: true, tenant_id: true },
    });

    this.logger.log(`Found ${clients.length} active hotel clients for digest generation`);

    for (const client of clients) {
      if (!client.tenant_id) continue;
      try {
        await this.digestService.generateDraft(client.tenant_id, client.id, periodStart, periodEnd);
      } catch (error) {
        this.logger.error(`Digest generation failed for tenant ${client.tenant_id}:`, error);
      }
    }

    this.logger.log('Bi-monthly digest generation completed');
  }

  /** Prior 15-day window ending "today" (both truncated to date-only, matching @db.Date columns). */
  private computeWindow(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 15);
    return { periodStart, periodEnd };
  }
}
