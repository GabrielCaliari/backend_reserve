import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { FunnelMetricsService } from './funnel-metrics.service';
import { MotorMetricsService } from '../../../reserve-motor/application/services/motor-metrics.service';

/** Endpoint agregador da home do portal: funil (bot) + motor (reservas) em uma chamada. */
@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funnelMetrics: FunnelMetricsService,
    private readonly motorMetrics: MotorMetricsService,
  ) {}

  async getHome(clientId: string, from: Date, to: Date) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
    if (!client.tenant_id) return errorResponse('400:HOTEL_CLIENT_WITHOUT_TENANT', 400);

    const [funil, motor] = await Promise.all([
      this.funnelMetrics.getMetrics(clientId, from, to),
      this.motorMetrics.metrics(client.tenant_id, from, to),
    ]);
    const bot = await this.botResumo(client.tenant_id, from, to);
    return successResponse({
      period: { from: from.toISOString(), to: to.toISOString() },
      funil,
      motor,
      bot,
    });
  }

  /**
   * Dinheiro que passou pelo bot, lido das projecoes dos eventos (contrato v2):
   * a pre-reserva vive no PMS, entao o motor de reservas nao enxerga esses valores.
   */
  private async botResumo(tenantId: string, from: Date, to: Date) {
    const confirmados = await this.prisma.funnelEvent.findMany({
      where: { tenant_id: tenantId, para_estagio: 'RESERVA_CONFIRMADA', ocorrido_em: { gte: from, lte: to } },
      select: { numero_contato: true },
      distinct: ['numero_contato'],
    });
    const numeros = confirmados.map((c) => c.numero_contato);

    const receita = await this.prisma.botLead.aggregate({
      where: { tenant_id: tenantId, numero_contato: { in: numeros } },
      _sum: { valor_confirmado_cents: true },
    });
    const recuperar = await this.prisma.botLead.aggregate({
      where: { tenant_id: tenantId, recuperar: true },
      _sum: { hold_valor_cents: true },
      _count: { _all: true },
    });

    return {
      receitaConfirmada: (receita._sum.valor_confirmado_cents ?? 0) / 100,
      reservas: numeros.length,
      aRecuperar: {
        quantidade: recuperar._count._all,
        valor: (recuperar._sum.hold_valor_cents ?? 0) / 100,
      },
    };
  }
}
