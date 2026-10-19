import { BotFeedbackService } from './bot-feedback.service';

const TENANT = 'tenant_1';
const AT = new Date('2026-10-19T15:13:11.168Z');

function fb(over: Record<string, unknown> = {}) {
  return {
    id: 'fb_1',
    tenant_id: TENANT,
    numero_contato: '5500970009951',
    texto: 'Adoramos, nota 10!',
    resumo: 'adorou',
    nota: 10,
    sentimento: 'positivo',
    check_out: new Date('2026-10-18T00:00:00.000Z'),
    link_enviado: true,
    source_event_id: 'ev_1',
    ocorrido_em: AT,
    ...over,
  };
}

const itemEsperado = {
  id: 'fb_1',
  numeroContato: '5500970009951',
  nomeContato: 'Gabriel Teste',
  texto: 'Adoramos, nota 10!',
  resumo: 'adorou',
  nota: 10,
  sentimento: 'positivo',
  checkOut: '2026-10-18',
  linkEnviado: true,
  ocorridoEm: AT,
};

describe('BotFeedbackService', () => {
  let prisma: any;
  let service: BotFeedbackService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: TENANT }) },
      botFeedback: {
        findMany: jest.fn().mockResolvedValue([fb()]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { nota: null } }),
      },
      botContact: { findMany: jest.fn().mockResolvedValue([{ numero_contato: '5500970009951', nome: 'Gabriel Teste' }]) },
    };
    service = new BotFeedbackService(prisma);
  });

  describe('list', () => {
    it('lista do mais recente, com o nome do contato e check-out em YYYY-MM-DD', async () => {
      const res = await service.list('c1', {});
      expect(prisma.botFeedback.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT },
        orderBy: { ocorrido_em: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(res).toEqual({ items: [itemEsperado], total: 1 });
    });

    it('filtra por sentimento e periodo e pagina', async () => {
      await service.list('c1', { sentimento: 'negativo', from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z', page: 3, limit: 10 });
      expect(prisma.botFeedback.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT,
          sentimento: 'negativo',
          ocorrido_em: { gte: new Date('2026-10-01T00:00:00Z'), lte: new Date('2026-10-31T00:00:00Z') },
        },
        orderBy: { ocorrido_em: 'desc' },
        skip: 20,
        take: 10,
      });
    });

    it('periodo em data pura: from 00:00 e to ate o fim do dia em Brasilia', async () => {
      await service.list('c1', { from: '2026-10-13', to: '2026-10-19' });
      expect(prisma.botFeedback.findMany.mock.calls[0][0].where.ocorrido_em).toEqual({
        gte: new Date('2026-10-13T03:00:00.000Z'),
        lt: new Date('2026-10-20T03:00:00.000Z'),
      });
    });

    it('limita o limit a 200 e check_out nulo vira null', async () => {
      prisma.botFeedback.findMany.mockResolvedValue([fb({ check_out: null })]);
      const res = await service.list('c1', { limit: 9999 });
      expect(prisma.botFeedback.findMany.mock.calls[0][0].take).toBe(200);
      expect(res.items[0].checkOut).toBeNull();
    });

    it('cliente sem tenant devolve vazio', async () => {
      prisma.hotelClient.findUnique.mockResolvedValue(null);
      expect(await service.list('x', {})).toEqual({ items: [], total: 0 });
    });
  });

  describe('summary', () => {
    it('conta por sentimento (zerando os ausentes), media com 1 casa e total', async () => {
      prisma.botFeedback.groupBy.mockResolvedValue([
        { sentimento: 'positivo', _count: { _all: 3 } },
        { sentimento: 'negativo', _count: { _all: 1 } },
      ]);
      prisma.botFeedback.aggregate.mockResolvedValue({ _avg: { nota: 8.333333 } });
      const res = await service.summary('c1', {});
      expect(res.total).toBe(4);
      expect(res.porSentimento).toEqual({ positivo: 3, neutro: 0, negativo: 1 });
      expect(res.notaMedia).toBe(8.3);
    });

    it('sem nenhuma nota a media e null', async () => {
      const res = await service.summary('c1', {});
      expect(res.notaMedia).toBeNull();
      expect(res.total).toBe(0);
    });

    it('melhores: positivo primeiro, maior nota (sem nota por ultimo), mais recente; piores o inverso; top 3', async () => {
      await service.summary('c1', { from: '2026-10-01T00:00:00Z' });
      const where = { tenant_id: TENANT, ocorrido_em: { gte: new Date('2026-10-01T00:00:00Z') } };
      expect(prisma.botFeedback.findMany).toHaveBeenNthCalledWith(1, {
        where,
        orderBy: [{ sentimento: 'desc' }, { nota: { sort: 'desc', nulls: 'last' } }, { ocorrido_em: 'desc' }],
        take: 3,
      });
      expect(prisma.botFeedback.findMany).toHaveBeenNthCalledWith(2, {
        where,
        orderBy: [{ sentimento: 'asc' }, { nota: { sort: 'asc', nulls: 'last' } }, { ocorrido_em: 'desc' }],
        take: 3,
      });
    });

    it('devolve melhores e piores como itens com nome', async () => {
      const res = await service.summary('c1', {});
      expect(res.melhores).toEqual([itemEsperado]);
      expect(res.piores).toEqual([itemEsperado]);
    });

    it('cliente sem tenant devolve resumo vazio', async () => {
      prisma.hotelClient.findUnique.mockResolvedValue(null);
      expect(await service.summary('x', {})).toEqual({
        total: 0, porSentimento: { positivo: 0, neutro: 0, negativo: 0 }, notaMedia: null, melhores: [], piores: [],
      });
    });
  });
});
