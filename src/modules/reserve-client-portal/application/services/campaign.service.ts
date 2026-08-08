import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  IDashboardRepository,
  IUpsertCampaignMetric,
} from '../../domain/interfaces/dashboard.repository.interface';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EFunnelStage } from '../../../../generated/prisma/enums';
import { QUALIFIED_OR_BEYOND_STAGES } from '../../domain/enums/funnel-stage-groups';

export interface ICampaignPerformanceRow {
  campaign_name: string;
  channel: string;
  spend: number;
  clicks: number;
  conversions: number;
  revenue_attributed: number;
  conversas: number;
  qualificados: number;
}

const QUALIFIED_STAGES: EFunnelStage[] = QUALIFIED_OR_BEYOND_STAGES;

@Injectable()
export class CampaignService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
    private readonly prisma: PrismaService,
  ) {}

  async upsertMetric(data: IUpsertCampaignMetric) {
    try {
      const metric = await this.dashboardRepository.upsertCampaignMetric(data);
      return successResponse(metric, 201);
    } catch (error) {
      return errorResponse('500:CAMPAIGN_METRIC_NOT_SAVED', 500, error);
    }
  }

  async getMetrics(clientId: string, from: Date, to: Date) {
    try {
      const metrics = await this.dashboardRepository.findCampaignMetricsByClientId(
        clientId,
        from,
        to,
      );
      return successResponse(metrics);
    } catch (error) {
      return errorResponse('500:CAMPAIGN_METRICS_NOT_FOUND', 500, error);
    }
  }

  /**
   * §3.2 / §8 Fase 2: adds conversas/qualificados columns to the existing
   * spend/clicks-only "desempenho por campanha" table, joined through
   * ConversationAttribution.campaign_id -> FunnelEvent. The join key today is
   * CampaignMetric.campaign_name (there is no numeric campaign id on that
   * table) matched against ConversationAttribution.campaign_id, which is only
   * ever populated when AttributionService.record() receives a Meta referral
   * source_id (Fase 2 Task 4) — so conversas/qualificados legitimately read 0
   * until that data exists, never an error (Global Constraints guard clause).
   */
  async getCampaignPerformance(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<ICampaignPerformanceRow[]> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client) {
      throw new BadRequestException('Hotel client not found.');
    }
    const tenantId = client.tenant_id;

    const metricGroups = await this.prisma.campaignMetric.groupBy({
      by: ['campaign_name', 'channel'],
      where: { client_id: clientId, metric_date: { gte: from, lte: to } },
      _sum: { spend: true, clicks: true, conversions: true, revenue_attributed: true },
    });

    if (metricGroups.length === 0) return [];

    // Without a linked tenant there is no ConversationAttribution/FunnelEvent
    // data to join against — every row still returns spend/clicks with
    // conversas/qualificados zeroed, matching the pre-existing nullable
    // HotelClient.tenant_id reality (Global Constraints), not an error.
    let conversasByCampaign = new Map<string, number>();
    let qualificadosByCampaign = new Map<string, number>();

    if (tenantId) {
      const [attributionGroups, latestAttributionPerContact] = await Promise.all([
        this.prisma.conversationAttribution.groupBy({
          by: ['campaign_id'],
          where: {
            tenant_id: tenantId,
            ocorrido_em: { gte: from, lte: to },
            campaign_id: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.conversationAttribution.findMany({
          where: { tenant_id: tenantId, ultimo_toque: true, campaign_id: { not: null } },
          select: { numero_contato: true, campaign_id: true },
        }),
      ]);

      conversasByCampaign = new Map(
        attributionGroups.map((g) => [g.campaign_id as string, g._count._all]),
      );

      const campaignByContact = new Map(
        latestAttributionPerContact.map((a) => [a.numero_contato, a.campaign_id as string]),
      );

      if (campaignByContact.size > 0) {
        const qualifiedEvents = await this.prisma.funnelEvent.findMany({
          where: {
            tenant_id: tenantId,
            ocorrido_em: { gte: from, lte: to },
            para_estagio: { in: QUALIFIED_STAGES },
            numero_contato: { in: Array.from(campaignByContact.keys()) },
          },
          select: { numero_contato: true },
          distinct: ['numero_contato'],
        });

        for (const event of qualifiedEvents) {
          const campaignId = campaignByContact.get(event.numero_contato);
          if (!campaignId) continue;
          qualificadosByCampaign.set(
            campaignId,
            (qualificadosByCampaign.get(campaignId) ?? 0) + 1,
          );
        }
      }
    }

    return metricGroups.map((g) => ({
      campaign_name: g.campaign_name,
      channel: String(g.channel),
      spend: g._sum.spend ?? 0,
      clicks: g._sum.clicks ?? 0,
      conversions: g._sum.conversions ?? 0,
      revenue_attributed: g._sum.revenue_attributed ?? 0,
      conversas: conversasByCampaign.get(g.campaign_name) ?? 0,
      qualificados: qualificadosByCampaign.get(g.campaign_name) ?? 0,
    }));
  }
}
