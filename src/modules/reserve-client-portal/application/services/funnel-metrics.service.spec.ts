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
  it('normaliza datasInteresse para string | null', async () => {
    const prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botLead: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([
          {
            numero_contato: '+5511999',
            acomodacao_interesse: null,
            datas_interesse: { checkin: '2026-09-12', checkout: '2026-09-15' },
          },
        ]),
      },
      botContact: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;

    const service = new FunnelMetricsService(prisma, {} as any);
    const board = await service.getBoard('client_1');
    expect(board[0].leads[0].datasInteresse).toBe('12/09/2026 – 15/09/2026');
  });
});
