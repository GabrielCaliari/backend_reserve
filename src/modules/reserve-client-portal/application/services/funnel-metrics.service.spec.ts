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

describe('FunnelMetricsService.getBoard', () => {
  function buildPrisma() {
    return {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botLead: {
        groupBy: jest.fn().mockResolvedValue([{ current_stage: 'OFERTA_FEITA', _count: { _all: 2 } }]),
        // 1a chamada: todos os leads (so numero + estagio) para os totais;
        // demais: leads da coluna (cap 50)
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(
            where.current_stage === undefined
              ? [
                  { numero_contato: '+5511999', current_stage: 'OFERTA_FEITA' },
                  { numero_contato: '+5511888', current_stage: 'OFERTA_FEITA' },
                ]
              : where.current_stage === 'OFERTA_FEITA'
                ? [
                    { numero_contato: '+5511999', acomodacao_interesse: null, datas_interesse: { checkin: '2026-09-12', checkout: '2026-09-15' } },
                    { numero_contato: '+5511888', acomodacao_interesse: 'Chalé', datas_interesse: null },
                  ]
                : [],
          ),
        ),
      },
      botContact: {
        findMany: jest.fn().mockResolvedValue([
          { numero_contato: '+5511999', nome: 'Ana', tipo_publico: null, status_bot: 'PAUSADO', last_message_at: new Date('2026-08-20T10:00:00Z') },
          { numero_contato: '+5511888', nome: null, tipo_publico: 'LEAD', status_bot: 'ATIVO', last_message_at: null },
        ]),
      },
      motorHold: {
        // ordenados por created_at desc: o primeiro de cada contato e o "mais recente"
        findMany: jest.fn().mockResolvedValue([
          { contato_whatsapp: '+5511999', status: 'EXPIRADO', valor_total: '500.00' },
          { contato_whatsapp: '+5511999', status: 'CANCELADO', valor_total: '100.00' },
          { contato_whatsapp: '+5511888', status: 'ATIVO', valor_total: '320.50' },
        ]),
      },
      motorReservation: {
        findMany: jest.fn().mockResolvedValue([
          { hospede_telefone: '+5511888', valor_total: '320.50' },
          { hospede_telefone: '+5500000', valor_total: '999.00' }, // contato sem lead: ignorado
        ]),
      },
    } as any;
  }

  it('normaliza datasInteresse para string | null', async () => {
    const service = new FunnelMetricsService(buildPrisma(), {} as any);
    const board = await service.getBoard('client_1');
    const coluna = board.find((c) => c.stage === 'OFERTA_FEITA')!;
    expect(coluna.leads[0].datasInteresse).toBe('12/09/2026 – 15/09/2026');
  });

  it('enriquece cada card com status do bot, espera, valor da cotacao e etiqueta de recuperacao', async () => {
    const service = new FunnelMetricsService(buildPrisma(), {} as any);
    const board = await service.getBoard('client_1');
    const coluna = board.find((c) => c.stage === 'OFERTA_FEITA')!;
    expect(coluna.leads[0]).toMatchObject({
      numeroContato: '+5511999',
      nome: 'Ana',
      statusBot: 'PAUSADO',
      aguardandoDesde: '2026-08-20T10:00:00.000Z',
      valorCotacao: 500,
      etiqueta: 'RECUPERAR',
    });
    expect(coluna.leads[1]).toMatchObject({
      numeroContato: '+5511888',
      statusBot: 'ATIVO',
      aguardandoDesde: null,
      valorCotacao: 320.5,
      etiqueta: null,
    });
  });

  it('soma R$ aberto (holds ATIVO+EXPIRADO) e confirmado (reservas) por coluna', async () => {
    const service = new FunnelMetricsService(buildPrisma(), {} as any);
    const board = await service.getBoard('client_1');
    const coluna = board.find((c) => c.stage === 'OFERTA_FEITA')!;
    expect(coluna.valorAberto).toBe(820.5);
    expect(coluna.valorConfirmado).toBe(320.5);
    const vazia = board.find((c) => c.stage === 'PERDIDO')!;
    expect(vazia).toMatchObject({ count: 0, valorAberto: 0, valorConfirmado: 0 });
  });

  it('holds sao buscados do mais novo para o mais velho e so nos status que contam', () => {
    const prisma = buildPrisma();
    const service = new FunnelMetricsService(prisma, {} as any);
    return service.getBoard('client_1').then(() => {
      expect(prisma.motorHold.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { created_at: 'desc' } }),
      );
      expect(prisma.motorReservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ origem: 'BOT_WHATSAPP' }),
        }),
      );
    });
  });
});
