import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { EBotMessageType, EBotMessageRole } from '../../../../generated/prisma/enums';
import {
  FUNNEL_ENTRY_STAGE,
  FUNNEL_LOST_STAGE,
  FUNNEL_STAGES_IN_ORDER,
  QUALIFIED_OR_BEYOND_STAGES,
} from '../../domain/enums/funnel-stage-groups';

const LEADS_PER_STAGE_CAP = 50;
const ALL_STAGES = FUNNEL_STAGES_IN_ORDER;

function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * datas_interesse e Json livre escrito pelo bot (string, {checkin, checkout}
 * ou lixo). O board e contrato de apresentacao: sempre string | null, senao
 * o Painel renderiza objeto cru e o React quebra.
 */
export function formatDatasInteresse(valor: unknown): string | null {
  if (typeof valor === 'string') return valor.trim() || null;
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    const { checkin, checkout } = valor as Record<string, unknown>;
    if (typeof checkin === 'string' && typeof checkout === 'string') {
      return `${dataBr(checkin)} – ${dataBr(checkout)}`;
    }
  }
  return null;
}

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

  /** Reservas que contam como venda — mesmo conjunto do MotorMetricsService. */
  private static readonly STATUS_VENDA = ['CONFIRMADA', 'CHECKIN_FEITO', 'CONCLUIDA'] as const;

  async getBoard(clientId: string) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return [];

    const [counts, todosLeads, holds, reservas] = await Promise.all([
      this.prisma.botLead.groupBy({
        by: ['current_stage'],
        where: { tenant_id: tenantId },
        _count: { _all: true },
      }),
      // Totais de R$ por coluna precisam de TODOS os leads da coluna, nao
      // so dos 50 exibidos — por isso uma leitura leve (numero + estagio).
      this.prisma.botLead.findMany({
        where: { tenant_id: tenantId },
        select: { numero_contato: true, current_stage: true },
      }),
      // Do mais novo para o mais velho: o primeiro de cada contato e a
      // cotacao vigente. CANCELADO e desistencia explicita: nao conta.
      this.prisma.motorHold.findMany({
        where: { tenant_id: tenantId, status: { in: ['ATIVO', 'EXPIRADO', 'CONVERTIDO'] } },
        select: { contato_whatsapp: true, status: true, valor_total: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.motorReservation.findMany({
        where: {
          tenant_id: tenantId,
          origem: 'BOT_WHATSAPP',
          status: { in: [...FunnelMetricsService.STATUS_VENDA] as any },
        },
        select: { hospede_telefone: true, valor_total: true },
      }),
    ]);
    const countByStage = new Map(counts.map((c) => [c.current_stage, c._count._all]));
    const stageByNumero = new Map(todosLeads.map((l) => [l.numero_contato, l.current_stage]));

    // Hold vigente por contato (primeiro na ordem desc).
    const holdVigente = new Map<string, { status: string; valor: number }>();
    for (const h of holds) {
      if (!holdVigente.has(h.contato_whatsapp)) {
        holdVigente.set(h.contato_whatsapp, { status: h.status, valor: Number(h.valor_total) });
      }
    }

    const valorAbertoByStage = new Map<string, number>();
    for (const [numero, hold] of holdVigente) {
      const stage = stageByNumero.get(numero);
      if (!stage || (hold.status !== 'ATIVO' && hold.status !== 'EXPIRADO')) continue;
      valorAbertoByStage.set(stage, (valorAbertoByStage.get(stage) ?? 0) + hold.valor);
    }
    const valorConfirmadoByStage = new Map<string, number>();
    for (const r of reservas) {
      const stage = r.hospede_telefone ? stageByNumero.get(r.hospede_telefone) : undefined;
      if (!stage) continue;
      valorConfirmadoByStage.set(stage, (valorConfirmadoByStage.get(stage) ?? 0) + Number(r.valor_total));
    }
    const arredonda = (v: number) => Math.round(v * 100) / 100;

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
              select: {
                numero_contato: true,
                nome: true,
                tipo_publico: true,
                status_bot: true,
                last_message_at: true,
              },
            })
          : [];
        const contatoByNumero = new Map(contacts.map((c) => [c.numero_contato, c]));

        return {
          stage,
          count: countByStage.get(stage) ?? 0,
          valorAberto: arredonda(valorAbertoByStage.get(stage) ?? 0),
          valorConfirmado: arredonda(valorConfirmadoByStage.get(stage) ?? 0),
          leads: leads.map((l) => {
            const contato = contatoByNumero.get(l.numero_contato);
            const hold = holdVigente.get(l.numero_contato);
            return {
              numeroContato: l.numero_contato,
              nome: contato?.nome ?? null,
              tipoPublico: contato?.tipo_publico ?? null,
              acomodacaoInteresse: l.acomodacao_interesse,
              datasInteresse: formatDatasInteresse(l.datas_interesse),
              statusBot: contato?.status_bot ?? 'ATIVO',
              aguardandoDesde: contato?.last_message_at?.toISOString() ?? null,
              valorCotacao: hold ? hold.valor : null,
              etiqueta: hold?.status === 'EXPIRADO' ? ('RECUPERAR' as const) : null,
            };
          }),
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
          para_estagio: { in: QUALIFIED_OR_BEYOND_STAGES },
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
    const entrada = byStage.get(FUNNEL_ENTRY_STAGE) ?? 0;

    // Percentuais relativos a CONTATO_INICIADO, a entrada do funil. PERDIDO
    // fica de fora porque e saida do funil, nao um degrau da escada.
    return ALL_STAGES.filter((s) => s !== FUNNEL_LOST_STAGE).map((stage) => {
      const count = byStage.get(stage) ?? 0;
      return { stage, count, rate: this.periodComparison.ratio(count, entrada) };
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
