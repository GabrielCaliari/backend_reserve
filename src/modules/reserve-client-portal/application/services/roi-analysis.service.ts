import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';

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

      // Nível 3 (Fase 6 Task 2) — gated the same way OverviewService.resolveMode
      // gates 'conversion' mode: any non-MANUAL booking engine has real
      // reservation data to attribute revenue against.
      if (client.booking_engine_type !== 'MANUAL') {
        const windowDays = attributionSettings?.window_days ?? 30;
        payload.nivel3 = await this.buildNivel3(tenantId, from, to, spendNow, conversasNow, windowDays);
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

  /**
   * Nível 3 (Fase 6 Task 2) — ROAS, ticket médio, taxa lead→reserva.
   *
   * Matching `HotelReservation.guest_phone` to `ConversationAttribution.
   * numero_contato` by phone number is exactly the "real, non-trivial
   * data-cleaning problem" the plan flags it as, not a one-line join:
   * `guest_phone` comes from each booking engine's adapter
   * (foco/omnibees/stays/generic — see `infrastructure/providers/adapters/
   * *.adapter.ts`) completely unnormalized (verified: none of the four
   * adapters touch the phone format at all), while `numero_contato` is
   * whatever the bot/WhatsApp side sends (typically E.164-ish, with country
   * code). `normalizeForMatch` + `findAttributionMatch` do a best-effort
   * digits-only match with a suffix fallback (to tolerate a missing/extra
   * country code on either side) rather than a strict equality join — this
   * is a heuristic, not a guaranteed-correct match, and undercounts are
   * expected whenever a booking engine stores a landline, a malformed
   * number, or a number for a different guest than the one who chatted.
   * **Flagged in the final report** — a real fix needs either normalizing
   * `guest_phone` at ingestion time (per adapter) or a dedicated
   * `HotelReservation.attributed_contact_id` link written by whoever
   * processes the reservation, rather than a query-time guess.
   */
  private async buildNivel3(
    tenantId: string,
    from: Date,
    to: Date,
    spend: number,
    conversas: number,
    windowDays: number,
  ) {
    const attributions = await this.prisma.conversationAttribution.findMany({
      where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to }, ultimo_toque: true },
      select: { numero_contato: true, ocorrido_em: true },
    });

    const zero = {
      revenueAttributed: this.periodComparison.money(0),
      roas: 0,
      avgTicket: this.periodComparison.money(0),
      leadToReservationRate: 0,
    };
    if (attributions.length === 0) return zero;

    const attributionByContact = new Map<string, Date>();
    for (const a of attributions) {
      attributionByContact.set(this.normalizeForMatch(a.numero_contato), a.ocorrido_em);
    }

    const reservationSearchTo = new Date(to.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const reservations = await this.prisma.hotelReservation.findMany({
      where: {
        tenant_id: tenantId,
        booking_date: { gte: from, lte: reservationSearchTo },
        guest_phone: { not: null },
      },
      select: { guest_phone: true, total_amount: true, booking_date: true },
    });

    let revenueAttributed = 0;
    let matchedCount = 0;
    for (const reservation of reservations) {
      const normalizedGuestPhone = this.normalizeForMatch(reservation.guest_phone as string);
      const attributedAt = this.findAttributionMatch(attributionByContact, normalizedGuestPhone);
      if (!attributedAt) continue;

      const windowEnd = new Date(attributedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
      if (reservation.booking_date >= attributedAt && reservation.booking_date <= windowEnd) {
        revenueAttributed += reservation.total_amount;
        matchedCount += 1;
      }
    }

    return {
      revenueAttributed: this.periodComparison.money(revenueAttributed),
      roas: this.periodComparison.round2(this.periodComparison.ratio(revenueAttributed, spend)),
      avgTicket: this.periodComparison.money(
        this.periodComparison.ratio(revenueAttributed, matchedCount),
      ),
      leadToReservationRate: this.periodComparison.round1(
        this.periodComparison.pct(matchedCount, conversas),
      ),
    };
  }

  private normalizeForMatch(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /** Exact digits match first; falls back to a suffix match (>=8 digits) to
   * tolerate a missing/extra country code on either side. */
  private findAttributionMatch(
    byContact: Map<string, Date>,
    normalizedPhone: string,
  ): Date | undefined {
    const exact = byContact.get(normalizedPhone);
    if (exact) return exact;
    if (normalizedPhone.length < 8) return undefined;

    for (const [key, date] of byContact) {
      if (key.length < 8) continue;
      if (key.endsWith(normalizedPhone) || normalizedPhone.endsWith(key)) return date;
    }
    return undefined;
  }
}
