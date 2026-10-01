import { LeadsOverviewService } from './leads-overview.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';

describe('LeadsOverviewService', () => {
  let prisma: {
    whatsAppLinkClick: { count: jest.Mock };
    $queryRaw: jest.Mock;
    hotelClient: { findUnique: jest.Mock };
    whatsAppTrackingLink: { findMany: jest.Mock };
    botContact: { findMany: jest.Mock };
    botLead: { count: jest.Mock };
  };
  let service: LeadsOverviewService;

  const clientId = 'client_123';
  const from = new Date('2026-07-15T00:00:00.000Z');
  const to = new Date('2026-07-30T00:00:00.000Z');

  beforeEach(() => {
    prisma = {
      whatsAppLinkClick: { count: jest.fn() },
      $queryRaw: jest.fn(),
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      whatsAppTrackingLink: { findMany: jest.fn().mockResolvedValue([]) },
      botContact: { findMany: jest.fn().mockResolvedValue([]) },
      botLead: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new LeadsOverviewService(
      prisma as any,
      new PeriodComparisonService(),
    );
  });

  it('counts clicks for the current and previous period, filtered by Link.client_id', async () => {
    prisma.whatsAppLinkClick.count
      .mockResolvedValueOnce(50) // current period
      .mockResolvedValueOnce(30); // previous period
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getOverview(clientId, from, to);

    expect(prisma.whatsAppLinkClick.count).toHaveBeenCalledTimes(2);
    const [currentCall, previousCall] = prisma.whatsAppLinkClick.count.mock.calls;
    expect(currentCall[0]).toMatchObject({
      where: {
        clicked_at: { gte: from, lte: to },
        Link: { client_id: clientId },
      },
    });
    expect(previousCall[0].where.Link).toEqual({ client_id: clientId });
    // previous period ends 1ms before `from` and has the same duration
    expect(previousCall[0].where.clicked_at.lte.getTime()).toBe(from.getTime() - 1);

    expect(result.clicks).toEqual({ value: 50, previous: 30, delta: 20, source: 'auto' });
  });

  it('returns byDay/byDevice/byCity breakdowns built from $queryRaw, scoped across every link of the client', async () => {
    prisma.whatsAppLinkClick.count.mockResolvedValue(0);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ day: '2026-07-20', count: 5n }]) // byDay
      .mockResolvedValueOnce([{ device_type: 'mobile', count: 3n }]) // byDevice
      .mockResolvedValueOnce([{ city: 'São Paulo', count: 2n }]); // byCity

    const result = await service.getOverview(clientId, from, to);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    // every raw query interpolates the client id so the aggregation spans
    // every tracking link belonging to this client, not a single link_id.
    for (const call of prisma.$queryRaw.mock.calls) {
      expect(call).toContain(clientId);
    }

    expect(result.byDay).toEqual([{ date: '2026-07-20', count: 5 }]);
    expect(result.byDevice).toEqual([{ device: 'mobile', count: 3 }]);
    expect(result.byCity).toEqual([{ city: 'São Paulo', count: 2 }]);
  });

  it('zero-data case: no clicks yet resolves to an empty-but-valid shape, never an error', async () => {
    prisma.whatsAppLinkClick.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getOverview(clientId, from, to);

    expect(result).toEqual({
      clicks: { value: 0, previous: 0, delta: 0, source: 'auto' },
      byDay: [],
      byDevice: [],
      byCity: [],
      ciclo: { cliques: 0, conversas: 0, reservas: 0 },
    });
  });

  it('ciclo: cliques -> conversas pelo link -> reservas', async () => {
    prisma.whatsAppLinkClick.count.mockResolvedValue(40);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.whatsAppTrackingLink.findMany.mockResolvedValue([{ short_code: 'inv26' }]);
    prisma.botContact.findMany.mockResolvedValue([{ numero_contato: 'a' }, { numero_contato: 'b' }]);
    prisma.botLead.count.mockResolvedValue(1);
    const overview = await service.getOverview('client_1', from, to);
    expect(overview.ciclo).toEqual({ cliques: overview.clicks.value, conversas: 2, reservas: 1 });
    expect(prisma.botContact.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant_1', link_code: { in: ['inv26'] }, iniciado_em: { gte: from, lte: to } },
      select: { numero_contato: true },
    });
  });
});
