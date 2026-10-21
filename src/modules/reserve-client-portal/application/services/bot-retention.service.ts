import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

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
    const [contact, messages, funnelEvents, issues, feedbacks, motorEvents, reservations] = await Promise.all([
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
      this.prisma.botIssue.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'asc' },
      }),
      this.prisma.botFeedback.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'asc' },
      }),
      // Eventos do motor para o bot que citam o contato (hold/reserva/pagamento)
      this.prisma.motorBotEvent.findMany({
        where: { tenant_id: tenantId, ...this.motorEventDoContato(numeroContato) },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.botReservation.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { confirmado_em: 'asc' },
      }),
    ]);

    return { contact, messages, funnelEvents, issues, feedbacks, motorEvents, reservations };
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
      // Reserva e agregado do ROI: mesmo hash da atribuicao, entao o casamento
      // reserva -> conversa continua valendo depois do apagamento.
      this.prisma.botReservation.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized, ctwa_clid: null },
      }),
      this.prisma.funnelEvent.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized },
      }),
      // Erros do bot: tira o numero e o conteudo da conversa, mas mantem a
      // linha para a contagem por codigo do relatorio.
      this.prisma.botIssue.updateMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { numero_contato: anonymized, mensagem: null, mensagem_hospede: null, resposta_bot: null, contexto: Prisma.DbNull },
      }),
      // Feedback do hospede e texto livre dele: apaga a linha (nao ha agregado a preservar).
      this.prisma.botFeedback.deleteMany({ where: { tenant_id: tenantId, numero_contato: numeroContato } }),
      // Outbox motor -> bot com o numero no payload: apaga (inclusive PENDING; o
      // bot nao deve mais receber nada sobre um contato apagado).
      this.prisma.motorBotEvent.deleteMany({ where: { tenant_id: tenantId, ...this.motorEventDoContato(numeroContato) } }),
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

  /**
   * Os 4 chamadores do motor que citam o hospede (hold.expirado,
   * pagamento.tardio.exception, reserva.confirmada) usam a chave contato_whatsapp.
   * reserva.confirmada_ota so traz hospede_nome (sem numero): sai pela purga de retencao.
   */
  private motorEventDoContato(numeroContato: string) {
    return { payload: { path: ['contato_whatsapp'], equals: numeroContato } };
  }

  private hashContact(tenantId: string, numeroContato: string): string {
    return crypto.createHash('sha256').update(`${tenantId}:${numeroContato}`).digest('hex').slice(0, 20);
  }
}
