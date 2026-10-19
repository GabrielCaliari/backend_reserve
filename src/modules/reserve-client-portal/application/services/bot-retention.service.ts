import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';

const DEFAULT_RETENTION_DAYS = 365;

/**
 * §5.8 LGPD — per-tenant retention, export, and erasure for bot conversation
 * data. funil_eventos is never hard-deleted (the audit trail is explicitly
 * the point of the append-only design); erasure anonymizes the identifying
 * field (numero_contato, hashed) on FunnelEvent/BotIngestionEvent rows
 * instead, preserving aggregate metrics while satisfying "right to erasure"
 * on personal data. Flagged as a product/legal decision — see final report.
 */
@Injectable()
export class BotRetentionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRetentionDays(tenantId: string): Promise<number> {
    const setting = await this.prisma.botDataRetentionSetting.findUnique({
      where: { tenant_id: tenantId },
    });
    return setting?.retention_days ?? DEFAULT_RETENTION_DAYS;
  }

  async setRetentionDays(tenantId: string, retentionDays: number): Promise<void> {
    await this.prisma.botDataRetentionSetting.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, retention_days: retentionDays },
      update: { retention_days: retentionDays },
    });
  }

  async exportContact(tenantId: string, numeroContato: string) {
    const [contact, messages, funnelEvents] = await Promise.all([
      this.prisma.botContact.findUnique({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
      }),
      this.prisma.botMessage.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'asc' },
      }),
      this.prisma.funnelEvent.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'asc' },
      }),
    ]);

    return { contact, messages, funnelEvents };
  }

  /**
   * Right to erasure: hard-deletes BotContact/BotMessage (the identifying,
   * content-bearing rows), anonymizes numero_contato (hashed) on
   * FunnelEvent/BotIngestionEvent so the audit trail's aggregate metrics
   * survive without the identifying field.
   */
  async eraseContact(tenantId: string, numeroContato: string): Promise<void> {
    const anonymized = this.hashContact(tenantId, numeroContato);

    await this.prisma.$transaction([
      this.prisma.botMessage.deleteMany({ where: { tenant_id: tenantId, numero_contato: numeroContato } }),
      this.prisma.botContact.deleteMany({ where: { tenant_id: tenantId, numero_contato: numeroContato } }),
      this.prisma.botLead.deleteMany({ where: { tenant_id: tenantId, numero_contato: numeroContato } }),
      this.prisma.followupAttempt.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized },
      }),
      this.prisma.conversationAttribution.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized },
      }),
      this.prisma.funnelEvent.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized },
      }),
      this.prisma.botIngestionEvent.updateMany({
        // contrato v2 grava contact.phone; 'contato' fica para eventos antigos
        where: {
          tenant_id: tenantId,
          OR: [
            { payload: { path: ['contact', 'phone'], equals: numeroContato } },
            { payload: { path: ['contato'], equals: numeroContato } },
          ],
        },
        data: { payload: {} },
      }),
    ]);
  }

  private hashContact(tenantId: string, numeroContato: string): string {
    return crypto.createHash('sha256').update(`${tenantId}:${numeroContato}`).digest('hex').slice(0, 20);
  }
}
