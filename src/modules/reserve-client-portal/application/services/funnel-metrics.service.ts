import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { EFunnelStage, EBotMessageType, EBotMessageRole } from '../../../../generated/prisma/enums';

const LEADS_PER_STAGE_CAP = 50;
const ALL_STAGES: EFunnelStage[] = [
  EFunnelStage.NOVO,
  EFunnelStage.QUALIFICADO,
  EFunnelStage.PAGAMENTO,
  EFunnelStage.FECHADO,
  EFunnelStage.FRIO,
];

/** §5.7 Bloco Funil — board + full metrics suite, the direct payoff of the append-only funil_eventos log. */
@Injectable()
export class FunnelMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodComparison: PeriodComparisonService,
  ) {}

  private async resolveTenantId(clientId: string): Promise<string | null> {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    return client?.tenant_id ?? null;
  }

  async getBoard(clientId: string) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return [];

    const counts = await this.prisma.botLead.groupBy({
      by: ['current_stage'],
      where: { tenant_id: tenantId },
      _count: { _all: true },
    });
    const countByStage = new Map(counts.map((c) => [c.current_stage, c._count._all]));

    const board = await Promise.all(
      ALL_STAGES.map(async (stage) => {
        const leads = await this.prisma.botLead.findMany({
          where: { tenant_id: tenantId, current_stage: stage },
          take: LEADS_PER_STAGE_CAP,
          orderBy: { updated_at: 'desc' },
        });
        const numeros = leads.map((l) => l.numero_contato);
        const contacts = numeros.length
          ? await this.prisma.botContact.findMany({
              where: { tenant_id: tenantId, numero_contato: { in: numeros } },
              select: { numero_contato: true, nome: true },
            })
          : [];
        const nomeByContato = new Map(contacts.map((c) => [c.numero_contato, c.nome]));

        return {
          stage,
          count: countByStage.get(stage) ?? 0,
          leads: leads.map((l) => ({
            numeroContato: l.numero_contato,
            nome: nomeByContato.get(l.numero_contato) ?? null,
            acomodacaoInteresse: l.acomodacao_interesse,
            datasInteresse: l.datas_interesse,
          })),
        };
      }),
    );

    return board;
  }

  async getMetrics(clientId: string, from: Date, to: Date) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return this.emptyMetrics();

    const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);

    const [
      conversasAtual,
      conversasAnterior,
      userMessages,
      assistantMessages,
      tempoPrimeiraResposta,
      distribuicaoFunil,
      tempoMedioPorEstagio,
      qualificados,
      leadsProntos,
      conversaoPorEtapa,
      followupRows,
      volumePorOrigem,
      contatosPausados,
      audiosTranscritos,
    ] = await Promise.all([
      this.prisma.botContact.count({ where: { tenant_id: tenantId, created_at: { gte: from, lte: to } } }),
      this.prisma.botContact.count({ where: { tenant_id: tenantId, created_at: { gte: prevFrom, lte: prevTo } } }),
      this.prisma.botMessage.count({
        where: { tenant_id: tenantId, role: EBotMessageRole.user, ocorrido_em: { gte: from, lte: to } },
      }),
      this.prisma.botMessage.count({
        where: { tenant_id: tenantId, role: EBotMessageRole.assistant, ocorrido_em: { gte: from, lte: to } },
      }),
      this.avgFirstResponseSeconds(tenantId, from, to),
      this.prisma.botLead.groupBy({
        by: ['current_stage'],
        where: { tenant_id: tenantId },
        _count: { _all: true },
      }),
      this.avgTimePerStage(tenantId, from, to),
      this.prisma.funnelEvent.findMany({
        where: {
          tenant_id: tenantId,
          ocorrido_em: { gte: from, lte: to },
          para_estagio: { in: [EFunnelStage.QUALIFICADO, EFunnelStage.PAGAMENTO, EFunnelStage.FECHADO] },
        },
        select: { numero_contato: true },
        distinct: ['numero_contato'],
      }),
      this.prisma.funnelEvent.count({
        where: { tenant_id: tenantId, motivo: 'TRANSFERIR', ocorrido_em: { gte: from, lte: to } },
      }),
      this.conversionByStage(tenantId, from, to),
      this.prisma.followupAttempt.groupBy({
        by: ['tipo_janela', 'status'],
        where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.botContact.groupBy({
        by: ['origem'],
        where: { tenant_id: tenantId, created_at: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.botContact.count({ where: { tenant_id: tenantId, status_bot: 'PAUSADO' } }),
      this.prisma.botMessage.count({
        where: { tenant_id: tenantId, tipo: EBotMessageType.audio, ocorrido_em: { gte: from, lte: to } },
      }),
    ]);

    return {
      conversasIniciadas: this.periodComparison.metric(conversasAtual, conversasAnterior, 'auto'),
      taxaRespostaBot: this.periodComparison.round2(this.periodComparison.ratio(assistantMessages, userMessages)),
      tempoMedioPrimeiraRespostaSegundos: tempoPrimeiraResposta,
      distribuicaoFunil: distribuicaoFunil.map((g) => ({ stage: g.current_stage, count: g._count._all })),
      tempoMedioPorEstagioSegundos: tempoMedioPorEstagio,
      taxaQualificacao: this.periodComparison.round2(
        this.periodComparison.ratio(qualificados.length, conversasAtual),
      ),
      leadsProntos,
      taxaConversaoPorEtapa: conversaoPorEtapa,
      efetividadeFollowup: followupRows.map((r) => ({
        tipoJanela: r.tipo_janela,
        status: r.status,
        count: r._count._all,
      })),
      volumePorOrigem: volumePorOrigem.map((r) => ({ origem: r.origem ?? 'desconhecido', count: r._count._all })),
      contatosPausados,
      audiosTranscritos,
    };
  }

  private async avgFirstResponseSeconds(tenantId: string, from: Date, to: Date): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ avg_seconds: number | null }[]>`
      WITH first_user AS (
        SELECT numero_contato, MIN(ocorrido_em) AS first_user_at
        FROM bot_messages
        WHERE tenant_id = ${tenantId} AND role = 'user' AND ocorrido_em BETWEEN ${from} AND ${to}
        GROUP BY numero_contato
      ),
      first_assistant AS (
        SELECT numero_contato, MIN(ocorrido_em) AS first_assistant_at
        FROM bot_messages
        WHERE tenant_id = ${tenantId} AND role = 'assistant' AND ocorrido_em BETWEEN ${from} AND ${to}
        GROUP BY numero_contato
      )
      SELECT AVG(EXTRACT(EPOCH FROM (fa.first_assistant_at - fu.first_user_at))) AS avg_seconds
      FROM first_user fu
      JOIN first_assistant fa ON fa.numero_contato = fu.numero_contato
      WHERE fa.first_assistant_at > fu.first_user_at
    `;
    const value = rows[0]?.avg_seconds;
    return value === null || value === undefined ? null : Number(value);
  }

  /**
   * §5.4/§5.7's direct payoff of the append-only log: consecutive
   * funil_eventos rows' ocorrido_em delta per contact (LAG), averaged per
   * para_estagio — matches the raw-SQL precedent already used in
   * whatsapp-tracking.service.ts's getLinkStats.
   */
  private async avgTimePerStage(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{ stage: string; avgSeconds: number }[]> {
    const rows = await this.prisma.$queryRaw<{ para_estagio: string; avg_seconds: number }[]>`
      WITH transitions AS (
        SELECT numero_contato, para_estagio, ocorrido_em,
          LAG(ocorrido_em) OVER (PARTITION BY numero_contato ORDER BY ocorrido_em) AS prev_time
        FROM funil_eventos
        WHERE tenant_id = ${tenantId} AND ocorrido_em BETWEEN ${from} AND ${to}
      )
      SELECT para_estagio, AVG(EXTRACT(EPOCH FROM (ocorrido_em - prev_time))) AS avg_seconds
      FROM transitions
      WHERE prev_time IS NOT NULL
      GROUP BY para_estagio
    `;
    return rows.map((r) => ({ stage: r.para_estagio, avgSeconds: Number(r.avg_seconds) }));
  }

  private async conversionByStage(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{ stage: string; count: number; rate: number }[]> {
    const rows = await this.prisma.funnelEvent.groupBy({
      by: ['para_estagio'],
      where: { tenant_id: tenantId, ocorrido_em: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const byStage = new Map(rows.map((r) => [r.para_estagio, r._count._all]));
    const novo = byStage.get(EFunnelStage.NOVO) ?? 0;

    // Stage-to-stage funnel percentages relative to NOVO, the funnel's entry
    // point — fronteira marked explicitly between PAGAMENTO -> FECHADO per
    // the plan's own callout of that transition.
    return ALL_STAGES.filter((s) => s !== EFunnelStage.FRIO).map((stage) => {
      const count = byStage.get(stage) ?? 0;
      return { stage, count, rate: this.periodComparison.ratio(count, novo) };
    });
  }

  private emptyMetrics() {
    return {
      conversasIniciadas: { value: 0, previous: null, delta: null, source: 'auto' as const },
      taxaRespostaBot: 0,
      tempoMedioPrimeiraRespostaSegundos: null,
      distribuicaoFunil: [],
      tempoMedioPorEstagioSegundos: [],
      taxaQualificacao: 0,
      leadsProntos: 0,
      taxaConversaoPorEtapa: [],
      efetividadeFollowup: [],
      volumePorOrigem: [],
      contatosPausados: 0,
      audiosTranscritos: 0,
    };
  }
}
