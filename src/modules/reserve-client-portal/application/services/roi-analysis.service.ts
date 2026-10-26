import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { ECampaignChannel } from '../../domain/enums/campaign-channel.enum';

/**
 * ROI Analysis — Níveis 1 e 2 (§3.9). Capstone service combining Fases 1-3's
 * outputs (CampaignMetric, ConversationAttribution, FunnelEvent,
 * BotIntegrationConfig) through PeriodComparisonService.
 *
 * Nível 2 is gated on `BotIntegrationConfig.active`, so on a tenant with no
 * bot integration provisioned this always resolves to Nível 1 only.
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
        select: { tenant_id: true },
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
      // field. Nível 3 is the only place a revenue field is ever introduced,
      // and only from reservations the bot saw confirmed (bot_reservas).

      if (botConfig?.active) {
        payload.nivel2 = await this.buildNivel2(clientId, tenantId, from, to, spendNow, conversasNow);

        // Nível 3 — a receita vem do reserva.confirmada do bot, entao o gate e
        // o mesmo do Nível 2: sem bot nao ha conversa nem reserva para atribuir.
        const windowDays = attributionSettings?.window_days ?? 30;
        payload.nivel3 = await this.buildNivel3(clientId, tenantId, from, to, conversasNow, windowDays);
      }

      return successResponse(payload);
    } catch (error) {
      return errorResponse('500:ROI_NOT_LOADED', 500, error);
    }
  }

  /**
   * Gasto em CENTAVOS. campaign_metrics guarda reais, mas todo dinheiro do
   * contrato do painel e em centavos (o front formata dividindo por 100) —
   * converter aqui evita que spend e custos saiam 100x menores na tela.
   */
  private async sumSpend(
    clientId: string,
    from: Date,
    to: Date,
    channel?: ECampaignChannel,
  ): Promise<number> {
    const agg = await this.prisma.campaignMetric.aggregate({
      where: { client_id: clientId, metric_date: { gte: from, lte: to }, ...(channel ? { channel } : {}) },
      _sum: { spend: true },
    });
    return Math.round((agg._sum.spend ?? 0) * 100);
  }

  private async buildNivel2(
    clientId: string,
    tenantId: string,
    from: Date,
    to: Date,
    spend: number,
    conversas: number,
  ) {
    const [qualificados, prontosParaFechar, roiByCampaign] = await Promise.all([
      // ATENCAO: "qualificados" aqui e o evento que entrou exatamente em
      // QUALIFICADO, enquanto FunnelMetricsService.taxaQualificacao e
      // CampaignService contam QUALIFICADO ou alem
      // (QUALIFIED_OR_BEYOND_STAGES). A divergencia e anterior ao funil v2 e
      // foi mantida de proposito: unificar mudaria os numeros ja reportados
      // deste painel, o que e decisao do dono, nao consequencia do rename.
      // Com 9 etapas o buraco fica maior (da para pular QUALIFICADO indo de
      // PUBLICO_IDENTIFICADO direto para ACOMODACAO_APRESENTADA).
      // Contatos distintos, e so os que abriram conversa no periodo: contar
      // eventos soltos deixava a taxa passar de 100% (quem conversou no mes
      // anterior e qualificou neste entrava no numerador e nao no denominador).
      this.countQualifiedFromCohort(tenantId, from, to),
      // Task 5 (Fase 3)'s ambiguity resolution: "prontos para fechar" is a
      // same-stage annotation event carrying motivo: 'TRANSFERIR', not a
      // distinct EFunnelStage value.
      this.prisma.funnelEvent.count({
        where: { tenant_id: tenantId, motivo: 'TRANSFERIR', ocorrido_em: { gte: from, lte: to } },
      }),
      this.buildRoiByCampaign(clientId, tenantId, from, to),
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

  private async countQualifiedFromCohort(tenantId: string, from: Date, to: Date): Promise<number> {
    const cohort = await this.prisma.conversationAttribution.findMany({
      where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to } },
      select: { numero_contato: true },
      distinct: ['numero_contato'],
    });
    if (cohort.length === 0) return 0;
    const qualified = await this.prisma.funnelEvent.findMany({
      where: {
        tenant_id: tenantId,
        para_estagio: 'QUALIFICADO',
        ocorrido_em: { gte: from, lte: to },
        numero_contato: { in: cohort.map((c) => c.numero_contato) },
      },
      select: { numero_contato: true },
      distinct: ['numero_contato'],
    });
    return qualified.length;
  }

  /** Per-campaign conversas/qualificados, joined through each contact's last-touch attribution. */
  private async buildRoiByCampaign(clientId: string, tenantId: string, from: Date, to: Date) {
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

    // A atribuicao guarda o ad_id do Meta em campaign_id; o nome vem do ad_metrics
    // (anuncio e campanha) para a tabela nao mostrar so o numero.
    const names = await this.prisma.adMetric.findMany({
      where: { client_id: clientId, ad_id: { in: [...byCampaign.keys()] } },
      select: { ad_id: true, ad_name: true, campaign_name: true },
      distinct: ['ad_id'],
      orderBy: [{ ad_id: 'asc' }, { metric_date: 'desc' }],
    });
    const nameById = new Map(names.map((n) => [n.ad_id, n]));

    return [...byCampaign.entries()].map(([campaignId, v]) => ({
      campaignId,
      adName: nameById.get(campaignId)?.ad_name ?? null,
      campaignName: nameById.get(campaignId)?.campaign_name ?? null,
      ...v,
    }));
  }

  /**
   * Nível 3 — receita atribuída, ROAS, ticket médio, taxa lead→reserva.
   *
   * Fonte: bot_reservas (reserva.confirmada do bot). O telefone ali é o mesmo
   * `numero_contato` da atribuicao_conversa (os dois vêm do bot), então o
   * casamento é exato — o motor de reservas não serve porque o Canal C manda o
   * contato criptografado. Uma reserva confirmada em [from, to] conta quando o
   * contato teve uma conversa atribuída até `windowDays` antes da confirmação.
   *
   * ROAS usa só o gasto do Meta Ads contra a receita das reservas que vieram de
   * anúncio (atribuição `anuncio` ou ctwa_clid/source_id no snapshot da
   * reserva): o gasto do Google leva ao site, não ao WhatsApp.
   */
  private async buildNivel3(
    clientId: string,
    tenantId: string,
    from: Date,
    to: Date,
    conversas: number,
    windowDays: number,
  ) {
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const [reservations, adSpend] = await Promise.all([
      this.prisma.botReservation.findMany({
        where: { tenant_id: tenantId, confirmado_em: { gte: from, lte: to } },
        select: {
          numero_contato: true,
          valor_cents: true,
          confirmado_em: true,
          source_id: true,
          ctwa_clid: true,
        },
      }),
      this.sumSpend(clientId, from, to, ECampaignChannel.META_ADS),
    ]);

    const contacts = [...new Set(reservations.map((r) => r.numero_contato))];
    const attributions = contacts.length
      ? await this.prisma.conversationAttribution.findMany({
          where: {
            tenant_id: tenantId,
            numero_contato: { in: contacts },
            ocorrido_em: { gte: new Date(from.getTime() - windowMs), lte: to },
          },
          select: { numero_contato: true, ocorrido_em: true, fonte: true },
          orderBy: { ocorrido_em: 'desc' },
        })
      : [];

    const byContact = new Map<string, { ocorrido_em: Date; fonte: string }[]>();
    for (const a of attributions) {
      const list = byContact.get(a.numero_contato) ?? [];
      list.push(a);
      byContact.set(a.numero_contato, list);
    }

    let revenueCents = 0;
    let revenueFromAdsCents = 0;
    let matchedCount = 0;
    for (const r of reservations) {
      // Último toque antes da confirmação, dentro da janela (lista já vem desc).
      const touch = byContact
        .get(r.numero_contato)
        ?.find(
          (a) =>
            a.ocorrido_em <= r.confirmado_em &&
            r.confirmado_em.getTime() - a.ocorrido_em.getTime() <= windowMs,
        );
      if (!touch) continue;

      matchedCount += 1;
      revenueCents += r.valor_cents;
      if (touch.fonte === 'anuncio' || r.ctwa_clid || r.source_id) {
        revenueFromAdsCents += r.valor_cents;
      }
    }

    const adSpendCents = adSpend;

    return {
      revenueAttributed: this.periodComparison.money(revenueCents),
      roas: this.periodComparison.round2(this.periodComparison.ratio(revenueFromAdsCents, adSpendCents)),
      avgTicket: this.periodComparison.money(this.periodComparison.ratio(revenueCents, matchedCount)),
      leadToReservationRate: this.periodComparison.round1(
        this.periodComparison.pct(matchedCount, conversas),
      ),
      revenueFromAds: this.periodComparison.money(revenueFromAdsCents),
      adSpend: this.periodComparison.money(adSpendCents),
      reservations: matchedCount,
    };
  }
}
