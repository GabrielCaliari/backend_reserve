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
    return successResponse({
      period: { from: from.toISOString(), to: to.toISOString() },
      funil,
      motor,
    });
  }
}
