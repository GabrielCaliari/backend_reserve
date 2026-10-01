import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { Metric, PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';

export interface ILeadsOverview {
  clicks: Metric;
  byDay: { date: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byCity: { city: string; count: number }[];
  ciclo: { cliques: number; conversas: number; reservas: number };
}

/**
 * §3.3 Camada 1 — same cliques→conversas breakdown WhatsAppTrackingService's
 * getLinkStats already gives per link, aggregated across every tracking link
 * of a client instead of a single link_id.
 */
@Injectable()
export class LeadsOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodComparison: PeriodComparisonService,
  ) {}

  async getOverview(clientId: string, from: Date, to: Date): Promise<ILeadsOverview> {
    const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);

    const [currentClicks, previousClicks, byDayRows, byDeviceRows, byCityRows] =
      await Promise.all([
        this.countClicks(clientId, from, to),
        this.countClicks(clientId, prevFrom, prevTo),
        this.groupByDay(clientId, from, to),
        this.groupByDevice(clientId, from, to),
        this.groupByCity(clientId, from, to),
      ]);

    const ciclo = await this.cicloDoLink(clientId, from, to, currentClicks);

    return {
      clicks: this.periodComparison.metric(currentClicks, previousClicks, 'auto'),
      byDay: byDayRows.map((r) => ({ date: r.day, count: Number(r.count) })),
      byDevice: byDeviceRows.map((r) => ({ device: r.device_type, count: Number(r.count) })),
      byCity: byCityRows.map((r) => ({ city: r.city, count: Number(r.count) })),
      ciclo,
    };
  }

  /**
   * Contrato v2 §4.6: fecha o ciclo clique -> conversa -> reserva cruzando o
   * short_code dos links rastreaveis com o link_code do contato.iniciado.
   */
  private async cicloDoLink(clientId: string, from: Date, to: Date, cliques: number) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    const links = await this.prisma.whatsAppTrackingLink.findMany({
      where: { client_id: clientId },
      select: { short_code: true },
    });
    if (!client?.tenant_id || links.length === 0) return { cliques, conversas: 0, reservas: 0 };

    const contatos = await this.prisma.botContact.findMany({
      where: {
        tenant_id: client.tenant_id,
        link_code: { in: links.map((l) => l.short_code) },
        iniciado_em: { gte: from, lte: to },
      },
      select: { numero_contato: true },
    });
    const numeros = contatos.map((c) => c.numero_contato);
    const reservas = numeros.length
      ? await this.prisma.botLead.count({
          where: { tenant_id: client.tenant_id, numero_contato: { in: numeros }, current_stage: 'RESERVA_CONFIRMADA' },
        })
      : 0;

    return { cliques, conversas: numeros.length, reservas };
  }

  private countClicks(clientId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.whatsAppLinkClick.count({
      where: {
        clicked_at: { gte: from, lte: to },
        Link: { client_id: clientId },
      },
    });
  }

  private groupByDay(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<{ day: string; count: number }[]> {
    return this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE(c.clicked_at) as day, COUNT(*) as count
      FROM whatsapp_link_clicks c
      JOIN whatsapp_tracking_links l ON l.id = c.link_id
      WHERE l.client_id = ${clientId} AND c.clicked_at BETWEEN ${from} AND ${to}
      GROUP BY DATE(c.clicked_at)
      ORDER BY day ASC
    `;
  }

  private groupByDevice(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<{ device_type: string; count: number }[]> {
    return this.prisma.$queryRaw<{ device_type: string; count: number }[]>`
      SELECT COALESCE(c.device_type, 'unknown') as device_type, COUNT(*) as count
      FROM whatsapp_link_clicks c
      JOIN whatsapp_tracking_links l ON l.id = c.link_id
      WHERE l.client_id = ${clientId} AND c.clicked_at BETWEEN ${from} AND ${to}
      GROUP BY c.device_type
      ORDER BY count DESC
    `;
  }

  private groupByCity(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<{ city: string; count: number }[]> {
    return this.prisma.$queryRaw<{ city: string; count: number }[]>`
      SELECT COALESCE(c.city, 'unknown') as city, COUNT(*) as count
      FROM whatsapp_link_clicks c
      JOIN whatsapp_tracking_links l ON l.id = c.link_id
      WHERE l.client_id = ${clientId} AND c.clicked_at BETWEEN ${from} AND ${to}
      GROUP BY c.city
      ORDER BY count DESC
      LIMIT 10
    `;
  }
}
