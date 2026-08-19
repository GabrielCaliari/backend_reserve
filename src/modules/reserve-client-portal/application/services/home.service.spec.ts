import { HomeService } from './home.service';

const prisma = {
  hotelClient: { findUnique: jest.fn() },
} as any;
const funnel = { getMetrics: jest.fn().mockResolvedValue({ conversasIniciadas: { value: 10 } }) } as any;
const motorMetrics = { metrics: jest.fn().mockResolvedValue({ receita: 1000 }) } as any;

describe('HomeService.getHome', () => {
  beforeEach(() => jest.clearAllMocks());

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
