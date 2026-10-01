import { HomeService } from './home.service';

const prisma = {
  hotelClient: { findUnique: jest.fn() },
  botLead: { aggregate: jest.fn(), count: jest.fn() },
  funnelEvent: { findMany: jest.fn() },
} as any;
const funnel = { getMetrics: jest.fn().mockResolvedValue({ conversasIniciadas: { value: 10 } }) } as any;
const motorMetrics = { metrics: jest.fn().mockResolvedValue({ receita: 1000 }) } as any;

describe('HomeService.getHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.funnelEvent.findMany.mockResolvedValue([]);
    prisma.botLead.aggregate.mockResolvedValue({ _sum: { valor_confirmado_cents: 0, hold_valor_cents: 0 }, _count: { _all: 0 } });
  });

  it('agrega funil e motor para o tenant do client', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ tenant_id: 'tenant_1' });
    const service = new HomeService(prisma, funnel, motorMetrics);
    const result = await service.getHome('client_1', new Date('2026-08-01'), new Date('2026-08-31'));
    expect(result.status).toBe(200);
    const data = result.data as any;
    expect(data.funil.conversasIniciadas.value).toBe(10);
    expect(data.motor.receita).toBe(1000);
    expect(motorMetrics.metrics).toHaveBeenCalledWith('tenant_1', expect.any(Date), expect.any(Date));
  });

  it('bloco bot: receita confirmada e a recuperar vem das projecoes, em reais', async () => {
    prisma.funnelEvent.findMany.mockResolvedValue([{ numero_contato: 'a' }, { numero_contato: 'b' }]);
    prisma.botLead.aggregate
      .mockResolvedValueOnce({ _sum: { valor_confirmado_cents: 254900 } })   // confirmadas no periodo
      .mockResolvedValueOnce({ _sum: { hold_valor_cents: 104900 }, _count: { _all: 3 } }); // a recuperar
    const service = new HomeService(prisma, funnel, motorMetrics);
    prisma.hotelClient.findUnique.mockResolvedValue({ tenant_id: 'tenant_1' });
    const from = new Date('2026-08-01');
    const to = new Date('2026-08-31');
    const result = await service.getHome('client_1', from, to);
    expect((result.data as any).bot).toEqual({
      receitaConfirmada: 2549, reservas: 2, aRecuperar: { quantidade: 3, valor: 1049 },
    });
    expect(prisma.botLead.aggregate).toHaveBeenNthCalledWith(1, {
      where: { tenant_id: 'tenant_1', numero_contato: { in: ['a', 'b'] } },
      _sum: { valor_confirmado_cents: true },
    });
  });

  it('404 quando client nao existe', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue(null);
    const service = new HomeService(prisma, funnel, motorMetrics);
    const result = await service.getHome('nope', new Date(), new Date());
    expect(result.status).toBe(404);
  });

  it('400 quando client sem tenant', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ tenant_id: null });
    const service = new HomeService(prisma, funnel, motorMetrics);
    const result = await service.getHome('client_1', new Date(), new Date());
    expect(result.status).toBe(400);
  });
});
