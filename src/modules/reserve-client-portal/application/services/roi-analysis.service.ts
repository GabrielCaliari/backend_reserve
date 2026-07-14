import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';

/**
 * ROI Analysis — Níveis 1 e 2 (§3.9). Capstone service combining Fases 1-3's
 * outputs (CampaignMetric, ConversationAttribution, FunnelEvent,
 * BotIntegrationConfig) through PeriodComparisonService.
 *
 * NOTE (integration): ConversationAttribution/FunnelEvent/BotIntegrationConfig
 * are declared in this branch's Fase 5 shim (see schema.prisma's "Fase 5 shim"
 * block) because Fase 2/3 are not merged into main yet. Nível 2 is gated on
 * `BotIntegrationConfig.active`, so on a tenant with no bot integration
 * provisioned this always resolves to Nível 1 only — exactly the same
 * behavior it will have once Fase 3's real ingestion pipeline starts writing
 * real rows into these tables.
 */
@Injectable()
export class RoiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodComparison: PeriodComparisonService,
  ) {}

  async getRoi(clientId: string, from: Date, to: Date) {
    try {
      const client = await this.prisma.hotelClient.findUnique({
        where: { id: clientId },
        select: { tenant_id: true, booking_engine_type: true },
      });
      if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      if (!client.tenant_id) {
        // Global Constraints guard clause: HotelClient.tenant_id is nullable at
        // the DB level; every real Painel Reserve client has one. Fail loudly.
        return errorResponse('400:HOTEL_CLIENT_WITHOUT_TENANT', 400);
      }
      const tenantId = client.tenant_id;

      const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);

      const [spendNow, spendPrev, conversasNow, conversasPrev, attributionSettings, botConfig] =
        await Promise.all([
          this.sumSpend(clientId, from, to),
          this.sumSpend(clientId, prevFrom, prevTo),
          this.prisma.conversationAttribution.count({
            where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to } },
          }),
          this.prisma.conversationAttribution.count({
            where: { tenant_id: tenantId, ocorrido_em: { gte: prevFrom, lte: prevTo } },
          }),
          this.prisma.attributionSettings.findUnique({ where: { tenant_id: tenantId } }),
          this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } }),
        ]);

      const costPerConvNow = this.periodComparison.round2(
        this.periodComparison.ratio(spendNow, conversasNow),
      );
      const costPerConvPrev = this.periodComparison.round2(
        this.periodComparison.ratio(spendPrev, conversasPrev),
      );
      const costPerConversation = this.periodComparison.metric(
        costPerConvNow,
        costPerConvPrev,
        'server',
      );

      // §3.9: "custo por conversa em queda é positivo. Inverter a lógica de
      // cor" — this is the ONE metric where a falling value is good news, so
      // the response carries an explicit trendDirection instead of making the
      // frontend special-case color logic per metric.
      const trendDirection: 'improving' | 'worsening' =
        costPerConversation.delta !== null && costPerConversation.delta < 0
          ? 'improving'
          : 'worsening';

      const payload: Record<string, unknown> = {
        period: {
          from: this.periodComparison.isoDate(from),
          to: this.periodComparison.isoDate(to),
        },
        comparedTo: {
          from: this.periodComparison.isoDate(prevFrom),
          to: this.periodComparison.isoDate(prevTo),
        },
        attributionWindow: {
          days: attributionSettings?.window_days ?? 30,
          visible: true,
        },
        nivel1: {
          spend: this.periodComparison.metric(
            this.periodComparison.round2(spendNow),
            this.periodComparison.round2(spendPrev),
            'server',
          ),
          conversas: this.periodComparison.metric(conversasNow, conversasPrev, 'auto'),
          costPerConversation: { ...costPerConversation, trendDirection },
        },
      };

      // §3.9's "regra inegociável": never compute/return an estimated revenue
      // field without booking-engine integration. This service never adds a
      // `revenue` key at all when MANUAL — Nível 3 (Fase 6 Task 2) is the only
      // place a revenue field is ever introduced, gated the same way.

      if (botConfig?.active) {
        payload.nivel2 = await this.buildNivel2(tenantId, from, to, spendNow, conversasNow);
      }

      return successResponse(payload);
    } catch (error) {
      return errorResponse('500:ROI_NOT_LOADED', 500, error);
    }
  }

  private async sumSpend(clientId: string, from: Date, to: Date): Promise<number> {
    const agg = await this.prisma.campaignMetric.aggregate({
      where: { client_id: clientId, metric_date: { gte: from, lte: to } },
      _sum: { spend: true },
    });
    return agg._sum.spend ?? 0;
  }

  private async buildNivel2(
    tenantId: string,
    from: Date,
    to: Date,
    spend: number,
    conversas: number,
  ) {
    const [qualificados, prontosParaFechar, roiByCampaign] = await Promise.all([
      this.prisma.funnelEvent.count({
        where: {
          tenant_id: tenantId,
          para_estagio: 'QUALIFICADO',
          ocorrido_em: { gte: from, lte: to },
        },
      }),
      // Task 5 (Fase 3)'s ambiguity resolution: "prontos para fechar" is a
      // same-stage annotation event carrying motivo: 'TRANSFERIR', not a
      // distinct EFunnelStage value.
      this.prisma.funnelEvent.count({
        where: { tenant_id: tenantId, motivo: 'TRANSFERIR', ocorrido_em: { gte: from, lte: to } },
      }),
      this.buildRoiByCampaign(tenantId, from, to),
    ]);

    return {
      costPerQualifiedLead: this.periodComparison.round2(
        this.periodComparison.ratio(spend, qualificados),
      ),
      costPerReadyToClose: this.periodComparison.round2(
        this.periodComparison.ratio(spend, prontosParaFechar),
      ),
      qualificationRate: this.periodComparison.round1(
        this.periodComparison.pct(qualificados, conversas),
      ),
      roiByCampaign,
    };
  }

  /** Per-campaign conversas/qualificados, joined through each contact's last-touch attribution. */
  private async buildRoiByCampaign(tenantId: string, from: Date, to: Date) {
    const attributions = await this.prisma.conversationAttribution.findMany({
      where: {
        tenant_id: tenantId,
        ocorrido_em: { gte: from, lte: to },
        ultimo_toque: true,
        campaign_id: { not: null },
      },
      select: { campaign_id: true, numero_contato: true },
    });

    if (attributions.length === 0) return [];

    const contacts = [...new Set(attributions.map((a) => a.numero_contato))];
    const qualifiedEvents = await this.prisma.funnelEvent.findMany({
      where: {
        tenant_id: tenantId,
        para_estagio: 'QUALIFICADO',
        ocorrido_em: { gte: from, lte: to },
        numero_contato: { in: contacts },
      },
      select: { numero_contato: true },
      distinct: ['numero_contato'],
    });
    const qualifiedContacts = new Set(qualifiedEvents.map((e) => e.numero_contato));

    const byCampaign = new Map<string, { conversas: number; qualificados: number }>();
    for (const a of attributions) {
      const key = a.campaign_id as string;
      const entry = byCampaign.get(key) ?? { conversas: 0, qualificados: 0 };
      entry.conversas += 1;
      if (qualifiedContacts.has(a.numero_contato)) entry.qualificados += 1;
      byCampaign.set(key, entry);
    }

    return [...byCampaign.entries()].map(([campaignId, v]) => ({ campaignId, ...v }));
  }
}
