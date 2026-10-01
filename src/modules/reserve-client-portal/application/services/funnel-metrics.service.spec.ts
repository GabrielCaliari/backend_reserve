import { FunnelMetricsService, formatDatasInteresse } from './funnel-metrics.service';

// datas_interesse e Json escrito pelo bot: pode ser string, objeto
// {checkin, checkout} ou qualquer outra coisa. O board e endpoint de
// apresentacao e DEVE devolver string | null — objeto cru quebrava o React
// no Painel ("Objects are not valid as a React child").
describe('formatDatasInteresse', () => {
  it('string passa direto (trim), vazia vira null', () => {
    expect(formatDatasInteresse('12 a 15 de setembro')).toBe('12 a 15 de setembro');
    expect(formatDatasInteresse('   ')).toBeNull();
  });

  it('objeto {checkin, checkout} vira intervalo legivel', () => {
    expect(formatDatasInteresse({ checkin: '2026-09-12', checkout: '2026-09-15' })).toBe(
      '12/09/2026 – 15/09/2026',
    );
  });

  it('shapes desconhecidos viram null', () => {
    expect(formatDatasInteresse(null)).toBeNull();
    expect(formatDatasInteresse(42)).toBeNull();
    expect(formatDatasInteresse(['2026-09-12'])).toBeNull();
    expect(formatDatasInteresse({ checkin: 1, checkout: 2 })).toBeNull();
  });
});

describe('FunnelMetricsService.getBoard (contrato v2 §4.3)', () => {
  function build(leadsPorEstagio: Record<string, any[]>) {
    const prisma: any = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botLead: {
        groupBy: jest.fn().mockImplementation(({ where }) => {
          if (where.hold_status) {
            return Promise.resolve([{ current_stage: 'FECHAMENTO_INICIADO', _sum: { hold_valor_cents: 154900 } }]);
          }
          return Promise.resolve([
            { current_stage: 'FECHAMENTO_INICIADO', _count: { _all: 2 }, _sum: { valor_confirmado_cents: 0 } },
            { current_stage: 'RESERVA_CONFIRMADA', _count: { _all: 1 }, _sum: { valor_confirmado_cents: 104900 } },
          ]);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(leadsPorEstagio[where.current_stage] ?? [])),
      },
      botContact: {
        findMany: jest.fn().mockResolvedValue([
          {
            numero_contato: '5535999', nome: 'Ana', tipo_publico: 'LEAD', status_bot: 'AGUARDANDO_PAGAMENTO',
            last_user_message_at: new Date('2026-10-01T10:00:00.000Z'),
          },
        ]),
      },
    };
    return { prisma, service: new FunnelMetricsService(prisma, {} as any) };
  }

  const lead = {
    numero_contato: '5535999', acomodacao_interesse: 'Suíte Master',
    datas_interesse: { checkin: '2026-11-20', checkout: '2026-11-22' },
    hold_codigo: 'M57', hold_status: 'EXPIRADA', hold_valor_cents: 104900,
    recuperar: true, motivo_perda: null,
  };

  it('soma em aberto e confirmado por coluna, em reais, sem tocar no motor', async () => {
    const { prisma, service } = build({ FECHAMENTO_INICIADO: [lead] });
    const board = await service.getBoard('client_1');
    const fechamento = board.find((c) => c.stage === 'FECHAMENTO_INICIADO')!;
    const confirmada = board.find((c) => c.stage === 'RESERVA_CONFIRMADA')!;
    expect(fechamento).toMatchObject({ count: 2, valorAberto: 1549, valorConfirmado: 0 });
    expect(confirmada).toMatchObject({ count: 1, valorConfirmado: 1049 });
    expect(prisma.motorHold).toBeUndefined();
    expect(prisma.botLead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: 'tenant_1', hold_status: { in: ['DISPONIVEL', 'AGUARDANDO', 'EXPIRADA'] } },
      }),
    );
  });

  it('card traz cotacao, etiqueta, hold e a espera contada da ultima mensagem do hospede', async () => {
    const { service } = build({ FECHAMENTO_INICIADO: [lead] });
    const board = await service.getBoard('client_1');
    expect(board.find((c) => c.stage === 'FECHAMENTO_INICIADO')!.leads[0]).toEqual({
      numeroContato: '5535999', nome: 'Ana', tipoPublico: 'LEAD',
      acomodacaoInteresse: 'Suíte Master', datasInteresse: '20/11/2026 – 22/11/2026',
      statusBot: 'AGUARDANDO_PAGAMENTO', aguardandoDesde: '2026-10-01T10:00:00.000Z',
      valorCotacao: 1049, etiqueta: 'RECUPERAR',
      motivoPerda: null, holdStatus: 'EXPIRADA', holdCodigo: 'M57',
    });
  });

  it('lead perdido expoe o motivo', async () => {
    const { service } = build({ PERDIDO: [{ ...lead, recuperar: false, hold_status: null, hold_valor_cents: null, motivo_perda: 'caro' }] });
    const board = await service.getBoard('client_1');
    expect(board.find((c) => c.stage === 'PERDIDO')!.leads[0]).toMatchObject({
      motivoPerda: 'caro', etiqueta: null, valorCotacao: null,
    });
  });
});


describe('FunnelMetricsService.getMetrics — handoff', () => {
  const from = new Date('2026-08-01T00:00:00Z');
  const to = new Date('2026-08-31T23:59:59Z');

  function buildPrisma() {
    const zero = jest.fn().mockResolvedValue(0);
    const vazio = jest.fn().mockResolvedValue([]);
    return {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botContact: {
        // 1a: conversas atual (4); 2a: anterior; 3a: pausados
        count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValue(1),
        groupBy: vazio,
        findMany: jest.fn().mockResolvedValue([
          { numero_contato: 'a', created_at: new Date('2026-08-10T10:00:00Z') },
          { numero_contato: 'b', created_at: new Date('2026-08-11T10:00:00Z') },
        ]),
      },
      botMessage: { count: zero },
      botLead: { groupBy: vazio },
      funnelEvent: {
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(
            where?.motivo?.startsWith === 'HANDOFF:'
              ? [
                  { numero_contato: 'a', motivo: 'HANDOFF:pediu_humano', ocorrido_em: new Date('2026-08-10T10:10:00Z') },
                  { numero_contato: 'b', motivo: 'HANDOFF:pediu_humano', ocorrido_em: new Date('2026-08-11T10:30:00Z') },
                  { numero_contato: 'b', motivo: 'HANDOFF:nao_soube', ocorrido_em: new Date('2026-08-12T10:00:00Z') },
                ]
              : [],
          ),
        ),
        count: zero,
        groupBy: vazio,
      },
      followupAttempt: { groupBy: vazio },
      $queryRaw: vazio,
    } as any;
  }
  const periodComparison = {
    previousPeriod: () => ({ prevFrom: from, prevTo: to }),
    metric: (v: number) => ({ value: v, source: 'auto' }),
    ratio: (a: number, b: number) => (b ? a / b : 0),
    round2: (v: number) => Math.round(v * 100) / 100,
  } as any;

  it('agrega total, taxa, motivos e tempo medio com o bot', async () => {
    const service = new FunnelMetricsService(buildPrisma(), periodComparison);
    const m = await service.getMetrics('client_1', from, to);
    expect(m.handoff.total).toBe(3);
    expect(m.handoff.taxaHandover).toBe(0.75); // 3 / 4 conversas
    expect(m.handoff.motivos).toEqual([
      { motivo: 'pediu_humano', count: 2 },
      { motivo: 'nao_soube', count: 1 },
    ]);
    // a: 10min; b: 30min (primeiro handoff de b) -> media 20min = 1200s
    expect(m.handoff.tempoMedioComBotSegundos).toBe(1200);
  });

  it('sem handoffs devolve zeros e null', async () => {
    const prisma = buildPrisma();
    prisma.funnelEvent.findMany = jest.fn().mockResolvedValue([]);
    const service = new FunnelMetricsService(prisma, periodComparison);
    const m = await service.getMetrics('client_1', from, to);
    expect(m.handoff).toEqual({ total: 0, taxaHandover: 0, motivos: [], tempoMedioComBotSegundos: null });
  });
});
