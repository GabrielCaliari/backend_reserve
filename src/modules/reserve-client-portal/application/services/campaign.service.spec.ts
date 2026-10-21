import { CampaignService } from './campaign.service';

const FROM = new Date('2026-10-01T00:00:00Z');
const TO = new Date('2026-10-31T23:59:59Z');

describe('CampaignService.getCampaignPerformance', () => {
  let prisma: any;
  let service: CampaignService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 't1' }) },
      campaignMetric: {
        groupBy: jest.fn().mockResolvedValue([
          // mesma campanha renomeada no periodo: vira uma linha so
          { campaign_id: 'c_1', campaign_name: 'Verao', channel: 'META_ADS', _sum: { spend: 10, clicks: 1, conversions: 2, revenue_attributed: 0 } },
          { campaign_id: 'c_1', campaign_name: 'Verao 2026', channel: 'META_ADS', _sum: { spend: 5, clicks: 1, conversions: 1, revenue_attributed: 0 } },
          { campaign_id: null, campaign_name: 'Pesquisa', channel: 'GOOGLE_ADS', _sum: { spend: 20, clicks: 9, conversions: 0, revenue_attributed: 0 } },
        ]),
      },
      conversationAttribution: {
        findMany: jest
          .fn()
          // conversas do periodo: ad_1 (novo, em ad_id) e ad_2 (legado, so em campaign_id)
          .mockResolvedValueOnce([
            { ad_id: 'ad_1', campaign_id: 'ad_1' },
            { ad_id: null, campaign_id: 'ad_2' },
            { ad_id: 'ad_desconhecido', campaign_id: 'ad_desconhecido' },
          ])
          // ultimo toque por contato
          .mockResolvedValueOnce([{ numero_contato: '5535999', ad_id: 'ad_1', campaign_id: 'ad_1' }]),
      },
      adMetric: {
        findMany: jest.fn().mockResolvedValue([
          { ad_id: 'ad_1', campaign_id: 'c_1' },
          { ad_id: 'ad_2', campaign_id: 'c_1' },
        ]),
      },
      funnelEvent: { findMany: jest.fn().mockResolvedValue([{ numero_contato: '5535999' }]) },
    };
    service = new CampaignService({} as any, prisma);
  });

  it('casa conversas pelo anuncio -> campanha e junta a campanha renomeada', async () => {
    const rows = await service.getCampaignPerformance('client_1', FROM, TO);

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.channel === 'META_ADS')).toEqual({
      campaign_name: 'Verao', channel: 'META_ADS',
      spend: 15, clicks: 2, conversions: 3, revenue_attributed: 0,
      conversas: 2, qualificados: 1,
    });
    expect(rows.find((r) => r.channel === 'GOOGLE_ADS')).toMatchObject({ spend: 20, conversas: 0, qualificados: 0 });
  });
});
