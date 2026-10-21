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
   * §3.2 / §8 Fase 2: adds conversas/qualificados columns to the
   * "desempenho por campanha" table.
   *
   * Join: the bot's Meta referral `source_id` is the AD id (stored on
   * ConversationAttribution.ad_id, and on campaign_id for rows written before
   * ad_id was filled). ad_metrics maps ad_id -> campaign_id, which matches
   * CampaignMetric.campaign_id. A source id that is not a known ad is tried as
   * a campaign id as-is. Campaigns without an id (Google, legacy rows) fall
   * back to the name, so conversas/qualificados read 0 there, never an error.
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
      by: ['campaign_id', 'campaign_name', 'channel'],
      where: { client_id: clientId, metric_date: { gte: from, lte: to } },
      _sum: { spend: true, clicks: true, conversions: true, revenue_attributed: true },
    });

    if (metricGroups.length === 0) return [];

    // Uma campanha renomeada no periodo aparece com dois nomes: junta pelo id.
    const rows = new Map<string, ICampaignPerformanceRow & { key: string }>();
    for (const g of metricGroups) {
      const key = g.campaign_id ? `id:${g.campaign_id}` : `name:${g.campaign_name}`;
      const row = rows.get(`${key}|${g.channel}`) ?? {
        key,
        campaign_name: g.campaign_name,
        channel: String(g.channel),
        spend: 0,
        clicks: 0,
        conversions: 0,
        revenue_attributed: 0,
        conversas: 0,
        qualificados: 0,
      };
      row.spend += g._sum.spend ?? 0;
      row.clicks += g._sum.clicks ?? 0;
      row.conversions += g._sum.conversions ?? 0;
      row.revenue_attributed += g._sum.revenue_attributed ?? 0;
      rows.set(`${key}|${g.channel}`, row);
    }

    // Without a linked tenant there is no ConversationAttribution/FunnelEvent
    // data to join against — every row still returns spend/clicks with
    // conversas/qualificados zeroed (Global Constraints), not an error.
    const conversasByCampaign = new Map<string, number>();
    const qualificadosByCampaign = new Map<string, number>();

    if (tenantId) {
      const sourceFilter = { OR: [{ ad_id: { not: null } }, { campaign_id: { not: null } }] };
      const [periodAttributions, latestAttributionPerContact, adCampaigns] = await Promise.all([
        this.prisma.conversationAttribution.findMany({
          where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to }, ...sourceFilter },
          select: { ad_id: true, campaign_id: true },
        }),
        this.prisma.conversationAttribution.findMany({
          where: { tenant_id: tenantId, ultimo_toque: true, ...sourceFilter },
          select: { numero_contato: true, ad_id: true, campaign_id: true },
        }),
        this.prisma.adMetric.findMany({
          where: { client_id: clientId, campaign_id: { not: null } },
          select: { ad_id: true, campaign_id: true },
          distinct: ['ad_id'],
        }),
      ]);

      const campaignByAd = new Map(adCampaigns.map((a) => [a.ad_id, a.campaign_id as string]));
      const campaignKey = (a: { ad_id: string | null; campaign_id: string | null }) => {
        const sourceId = (a.ad_id ?? a.campaign_id) as string;
        return `id:${campaignByAd.get(sourceId) ?? sourceId}`;
      };

      for (const a of periodAttributions) {
        const key = campaignKey(a);
        conversasByCampaign.set(key, (conversasByCampaign.get(key) ?? 0) + 1);
      }

      const campaignByContact = new Map(
        latestAttributionPerContact.map((a) => [a.numero_contato, campaignKey(a)]),
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
          const key = campaignByContact.get(event.numero_contato);
          if (!key) continue;
          qualificadosByCampaign.set(key, (qualificadosByCampaign.get(key) ?? 0) + 1);
        }
      }
    }

    return [...rows.values()].map(({ key, ...row }) => ({
      ...row,
      conversas: conversasByCampaign.get(key) ?? 0,
      qualificados: qualificadosByCampaign.get(key) ?? 0,
    }));
  }
}
