import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';
import { EBotMessageRole } from '../../../../generated/prisma/enums';
import {
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

  /** Holds que ainda representam dinheiro em aberto na coluna (contrato v2 §4.3). */
  private static readonly HOLD_EM_ABERTO = ['DISPONIVEL', 'AGUARDANDO', 'EXPIRADA'];

  async getBoard(clientId: string) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return [];

    // Os totais vem da projecao do lead (alimentada pelos eventos do bot) —
    // o funil nao le mais o motor de reservas: a pre-reserva vive no PMS.
    const [porEstagio, abertoPorEstagio] = await Promise.all([
      this.prisma.botLead.groupBy({
        by: ['current_stage'],
        where: { tenant_id: tenantId },
        _count: { _all: true },
        _sum: { valor_confirmado_cents: true },
      }),
      this.prisma.botLead.groupBy({
        by: ['current_stage'],
        where: { tenant_id: tenantId, hold_status: { in: FunnelMetricsService.HOLD_EM_ABERTO } },
        _sum: { hold_valor_cents: true },
      }),
    ]);
    const totais = new Map(porEstagio.map((g) => [g.current_stage, g]));
    const aberto = new Map(abertoPorEstagio.map((g) => [g.current_stage, g._sum.hold_valor_cents ?? 0]));
    const reais = (cents: number) => Math.round(cents) / 100;

    const board = [];
    // Sequencial de proposito: pool pg max 3.
    for (const stage of ALL_STAGES) {
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
              numero_contato: true, nome: true, tipo_publico: true,
              status_bot: true, last_user_message_at: true,
            },
          })
        : [];
      const contatoByNumero = new Map(contacts.map((c) => [c.numero_contato, c]));

      board.push({
        stage,
        count: totais.get(stage)?._count._all ?? 0,
        valorAberto: reais(aberto.get(stage) ?? 0),
        valorConfirmado: reais(totais.get(stage)?._sum.valor_confirmado_cents ?? 0),
        leads: leads.map((l) => {
          const contato = contatoByNumero.get(l.numero_contato);
          return {
            numeroContato: l.numero_contato,
            nome: contato?.nome ?? null,
            tipoPublico: contato?.tipo_publico ?? null,
            acomodacaoInteresse: l.acomodacao_interesse,
            datasInteresse: formatDatasInteresse(l.datas_interesse),
            statusBot: contato?.status_bot ?? 'ATIVO',
            // Contrato §4.3: a espera conta da ultima mensagem DO HOSPEDE.
            aguardandoDesde: contato?.last_user_message_at?.toISOString() ?? null,
            valorCotacao: l.hold_valor_cents == null ? null : reais(l.hold_valor_cents),
            etiqueta: l.recuperar ? ('RECUPERAR' as const) : null,
            motivoPerda: l.motivo_perda ?? null,
            holdStatus: l.hold_status ?? null,
            holdCodigo: l.hold_codigo ?? null,
          };
        }),
      });
    }
    return board;
  }

  private static readonly ESTAGIOS_PRONTOS = ['FECHAMENTO_INICIADO', 'COMPROVANTE_RECEBIDO'];
  private static readonly STATUS_COM_HUMANO = ['PAUSADO', 'PAUSADO_HUMANO'];

  async getMetrics(clientId: string, from: Date, to: Date) {
    const tenantId = await this.resolveTenantId(clientId);
    if (!tenantId) return this.emptyMetrics();

    const { prevFrom, prevTo } = this.periodComparison.previousPeriod(from, to);
    const periodo = { gte: from, lte: to };

    const [conversasAtual, conversasAnterior, contatosComResposta] = await Promise.all([
      this.prisma.botContact.count({ where: { tenant_id: tenantId, iniciado_em: periodo } }),
      this.prisma.botContact.count({
        where: { tenant_id: tenantId, iniciado_em: { gte: prevFrom, lte: prevTo } },
      }),
      this.prisma.botMessage.findMany({
        where: { tenant_id: tenantId, role: EBotMessageRole.assistant, ocorrido_em: periodo },
        select: { numero_contato: true },
        distinct: ['numero_contato'],
      }),
    ]);

    const [tempoPrimeiraResposta, tempoMedioPorEstagio, conversaoPorEtapa] = await Promise.all([
      this.avgFirstResponseSeconds(tenantId, from, to),
      this.avgTimePerStage(tenantId, from, to),
      this.conversionByStage(tenantId, from, to, conversasAtual),
    ]);

    const [distribuicaoFunil, qualificados, leadsProntos] = await Promise.all([
      this.prisma.botLead.groupBy({
        by: ['current_stage'],
        where: { tenant_id: tenantId },
        _count: { _all: true },
      }),
      this.prisma.funnelEvent.findMany({
        where: { tenant_id: tenantId, ocorrido_em: periodo, para_estagio: { in: QUALIFIED_OR_BEYOND_STAGES } },
        select: { numero_contato: true },
        distinct: ['numero_contato'],
      }),
      this.prisma.botLead.count({
        where: { tenant_id: tenantId, current_stage: { in: FunnelMetricsService.ESTAGIOS_PRONTOS as any } },
      }),
    ]);

    const [followupRows, volumePorOrigem, conversasPorAnuncio] = await Promise.all([
      this.prisma.followupAttempt.groupBy({
        by: ['regua', 'status'],
        where: { tenant_id: tenantId, ocorrido_em: periodo },
        _count: { _all: true },
      }),
      this.prisma.botContact.groupBy({
        by: ['origem'],
        where: { tenant_id: tenantId, iniciado_em: periodo },
        _count: { _all: true },
      }),
      this.prisma.botContact.groupBy({
        by: ['source_id'],
        where: { tenant_id: tenantId, iniciado_em: periodo, source_id: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const [contatosPausados, audiosTranscritos, handoff] = await Promise.all([
      this.prisma.botContact.count({
        where: { tenant_id: tenantId, status_bot: { in: FunnelMetricsService.STATUS_COM_HUMANO as any } },
      }),
      this.prisma.botIngestionEvent.count({
        where: { tenant_id: tenantId, event_type: 'audio.transcrito', occurred_at: periodo },
      }),
      this.handoffMetrics(tenantId, from, to),
    ]);

    return {
      conversasIniciadas: this.periodComparison.metric(conversasAtual, conversasAnterior, 'auto'),
      taxaRespostaBot: this.periodComparison.round2(
        this.periodComparison.ratio(contatosComResposta.length, conversasAtual),
      ),
      tempoMedioPrimeiraRespostaSegundos: tempoPrimeiraResposta,
      distribuicaoFunil: distribuicaoFunil.map((g) => ({ stage: g.current_stage, count: g._count._all })),
      tempoMedioPorEstagioSegundos: tempoMedioPorEstagio,
      taxaQualificacao: this.periodComparison.round2(
        this.periodComparison.ratio(qualificados.length, conversasAtual),
      ),
      leadsProntos,
      taxaConversaoPorEtapa: conversaoPorEtapa,
      efetividadeFollowup: followupRows.map((r) => ({
        regua: r.regua ?? 'desconhecida',
        status: r.status,
        count: r._count._all,
      })),
      volumePorOrigem: volumePorOrigem.map((r) => ({ origem: r.origem ?? 'desconhecido', count: r._count._all })),
      conversasPorAnuncio: conversasPorAnuncio
        .map((r) => ({ sourceId: r.source_id as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      contatosPausados,
      audiosTranscritos,
      handoff: {
        ...handoff,
        taxaHandover: this.periodComparison.round2(this.periodComparison.ratio(handoff.total, conversasAtual)),
      },
    };
  }

  private async avgFirstResponseSeconds(tenantId: string, from: Date, to: Date): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ avg_seconds: number | null }[]>`
      WITH first_assistant AS (
        SELECT numero_contato, MIN(ocorrido_em) AS first_assistant_at
        FROM bot_messages
        WHERE tenant_id = ${tenantId} AND role = 'assistant'
        GROUP BY numero_contato
      )
      SELECT AVG(EXTRACT(EPOCH FROM (fa.first_assistant_at - c.iniciado_em))) AS avg_seconds
      FROM bot_contacts c
      JOIN first_assistant fa ON fa.numero_contato = c.numero_contato
      WHERE c.tenant_id = ${tenantId}
        AND c.iniciado_em BETWEEN ${from} AND ${to}
        AND fa.first_assistant_at >= c.iniciado_em
    `;
    const value = rows[0]?.avg_seconds;
    return value === null || value === undefined ? null : Number(value);
  }

  /**
   * Ciclo bot -> humano (benchmark P0-4c). Cada anotacao HANDOFF:<motivo> e
   * uma escalacao; "tempo com o bot" = do inicio do contato ate a PRIMEIRA
   * escalacao daquele numero (segunda escalacao do mesmo contato conta no
   * total e nos motivos, mas nao distorce o tempo).
   */
  private async handoffMetrics(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{ total: number; motivos: { motivo: string; count: number }[]; tempoMedioComBotSegundos: number | null }> {
    const eventos = await this.prisma.funnelEvent.findMany({
      where: { tenant_id: tenantId, motivo: { startsWith: 'HANDOFF:' }, ocorrido_em: { gte: from, lte: to } },
      select: { numero_contato: true, motivo: true, ocorrido_em: true },
      orderBy: { ocorrido_em: 'asc' },
    });
    if (eventos.length === 0) return { total: 0, motivos: [], tempoMedioComBotSegundos: null };

    const porMotivo = new Map<string, number>();
    const primeiroHandoff = new Map<string, Date>();
    for (const e of eventos) {
      const motivo = (e.motivo ?? '').slice('HANDOFF:'.length) || 'nao_informado';
      porMotivo.set(motivo, (porMotivo.get(motivo) ?? 0) + 1);
      if (!primeiroHandoff.has(e.numero_contato)) primeiroHandoff.set(e.numero_contato, e.ocorrido_em);
    }

    const contatos = await this.prisma.botContact.findMany({
      where: { tenant_id: tenantId, numero_contato: { in: [...primeiroHandoff.keys()] } },
      select: { numero_contato: true, iniciado_em: true, created_at: true },
    });
    const duracoes: number[] = [];
    for (const c of contatos) {
      const h = primeiroHandoff.get(c.numero_contato);
      if (!h) continue;
      const inicio = c.iniciado_em ?? c.created_at;
      const seg = (h.getTime() - inicio.getTime()) / 1000;
      if (seg >= 0) duracoes.push(seg);
    }
    const media = duracoes.length
      ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length)
      : null;

    return {
      total: eventos.length,
      motivos: [...porMotivo.entries()]
        .map(([motivo, count]) => ({ motivo, count }))
        .sort((a, b) => b.count - a.count),
      tempoMedioComBotSegundos: media,
    };
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
    conversasIniciadas: number,
  ): Promise<{ stage: string; count: number; rate: number }[]> {
    const rows = await this.prisma.$queryRaw<{ para_estagio: string; contatos: bigint }[]>`
      SELECT para_estagio, COUNT(DISTINCT numero_contato) AS contatos
      FROM funil_eventos
      WHERE tenant_id = ${tenantId}
        AND ocorrido_em BETWEEN ${from} AND ${to}
        AND de_estagio IS DISTINCT FROM para_estagio
        AND (motivo IS NULL OR motivo NOT LIKE 'HANDOFF:%')
      GROUP BY para_estagio
    `;
    const byStage = new Map(rows.map((r) => [r.para_estagio, Number(r.contatos)]));

    // PERDIDO fica de fora: e saida do funil, nao um degrau da escada.
    return ALL_STAGES.filter((s) => s !== FUNNEL_LOST_STAGE).map((stage) => {
      const count = byStage.get(stage) ?? 0;
      return { stage, count, rate: this.periodComparison.ratio(count, conversasIniciadas) };
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
      conversasPorAnuncio: [],
      contatosPausados: 0,
      audiosTranscritos: 0,
      handoff: { total: 0, taxaHandover: 0, motivos: [], tempoMedioComBotSegundos: null },
    };
  }
}
