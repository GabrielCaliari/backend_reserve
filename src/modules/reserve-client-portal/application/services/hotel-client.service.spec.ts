import { HotelClientService } from './hotel-client.service';

describe('HotelClientService (webhook_secret do Canal C nunca sai em resposta)', () => {
  let repo: any;
  let prisma: any;
  let service: HotelClientService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByAdminId: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    prisma = {
      hotelClient: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new HotelClientService(repo, prisma, {} as any, {} as any, {} as any);
  });

  it('findById nao devolve webhook_secret, so webhook_secret_set', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ id: 'c1', tenant_id: 't1', webhook_secret: 'segredo', ApiCredentials: [] });
    const r = await service.findById('c1');
    expect(r.data).not.toHaveProperty('webhook_secret');
    expect(r.data).toEqual(expect.objectContaining({ webhook_secret_set: true, tenant_id: 't1' }));
  });

  it('findAllByTenant, getClientForCurrentTenant, findAll, findByAdminId e update tambem sanitizam', async () => {
    const row = { id: 'c1', tenant_id: 't1', webhook_secret: 'segredo', ApiCredentials: [] };
    prisma.hotelClient.findMany.mockResolvedValue([row]);
    prisma.hotelClient.findUnique.mockResolvedValue(row);
    repo.findAll.mockResolvedValue({ data: [row], total: 1 });
    repo.findByAdminId.mockResolvedValue([row]);
    repo.findById.mockResolvedValue(row);
    repo.update.mockResolvedValue(row);

    const results = [
      await service.findAllByTenant('t1'),
      await service.getClientForCurrentTenant('t1'),
      await service.findAll(1, 20),
      await service.findByAdminId('a1'),
      await service.update('c1', {} as any),
    ];
    for (const r of results) {
      expect(JSON.stringify(r.data)).not.toContain('segredo');
      expect(JSON.stringify(r.data)).toContain('"webhook_secret_set":true');
    }
  });

  it('webhook_secret_set e false quando nao ha segredo', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ id: 'c1', webhook_secret: null, ApiCredentials: [] });
    const r = await service.findById('c1');
    expect(r.data).toEqual(expect.objectContaining({ webhook_secret_set: false }));
  });

  it('regenerateWebhookSecret grava e devolve o segredo uma vez', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.hotelClient.update.mockResolvedValue({ id: 'c1' });
    const r = await service.regenerateWebhookSecret('c1');
    expect(r.status).toBe(201);
    expect((r.data as any).webhook_secret).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.hotelClient.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { webhook_secret: (r.data as any).webhook_secret },
    });
  });

  it('regenerateWebhookSecret devolve 404 para cliente inexistente', async () => {
    prisma.hotelClient.findUnique.mockResolvedValue(null);
    const r = await service.regenerateWebhookSecret('nope');
    expect(r.status).toBe(404);
    expect(prisma.hotelClient.update).not.toHaveBeenCalled();
  });
});
