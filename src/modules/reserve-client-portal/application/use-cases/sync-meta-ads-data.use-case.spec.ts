import { SyncMetaAdsDataUseCase } from './sync-meta-ads-data.use-case';
import { IMetaAdMetric, MetaAdsApiError } from '../../infrastructure/providers/meta-ads.provider';

const DAY1 = new Date('2026-10-05');
const DAY2 = new Date('2026-10-06');

function ad(over: Partial<IMetaAdMetric> = {}): IMetaAdMetric {
  return {
    ad_id: 'ad_1', ad_name: 'A1', adset_id: 'as_1', adset_name: 'S1',
    campaign_id: 'c_1', campaign_name: 'Campanha 1', date: DAY1,
    spend: 10, impressions: 100, clicks: 5, reach: 80, conversations: 2,
    ...over,
  };
}

describe('SyncMetaAdsDataUseCase', () => {
  let prisma: any;
  let provider: { fetchAdMetrics: jest.Mock };
  let campaignService: { upsertMetric: jest.Mock };
  let aes: { decrypt: jest.Mock };
  let useCase: SyncMetaAdsDataUseCase;
  /** Estado em memoria das duas tabelas, pela chave natural de cada upsert. */
  let adTable: Map<string, any>;
  let campaignTable: Map<string, any>;
  const originalToken = process.env.META_SYSTEM_USER_TOKEN;

  beforeEach(() => {
    delete process.env.META_SYSTEM_USER_TOKEN;
    adTable = new Map();
    campaignTable = new Map();
    prisma = {
      hotelApiCredential: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cred_1', encrypted_token: 'enc', meta_ad_account_id: '123' }),
        update: jest.fn().mockResolvedValue({}),
      },
      adMetric: {
        upsert: jest.fn(({ where, create, update }) => {
          const k = where.client_id_ad_id_metric_date;
          const key = `${k.client_id}|${k.ad_id}|${k.metric_date.toISOString()}`;
          adTable.set(key, { ...(adTable.get(key) ?? create), ...update });
          return Promise.resolve({});
        }),
      },
    };
    provider = { fetchAdMetrics: jest.fn() };
    campaignService = {
      upsertMetric: jest.fn((data) => {
        campaignTable.set(`${data.campaign_id}|${data.metric_date.toISOString()}`, data);
        return Promise.resolve({ data, status: 201 });
      }),
    };
    aes = { decrypt: jest.fn().mockReturnValue('tok_proprio') };
    useCase = new SyncMetaAdsDataUseCase(provider as any, campaignService as any, prisma, aes as any);
    for (const level of ['log', 'warn', 'error'] as const) {
      jest.spyOn((useCase as any).logger, level).mockImplementation(() => undefined);
    }
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.META_SYSTEM_USER_TOKEN;
    else process.env.META_SYSTEM_USER_TOKEN = originalToken;
  });

  it('grava uma linha por anuncio por dia e a soma por campanha e dia', async () => {
    provider.fetchAdMetrics.mockResolvedValue([
      ad(),
      ad({ ad_id: 'ad_2', spend: 5.5, impressions: 50, clicks: 1, conversations: 1 }),
      ad({ date: DAY2, spend: 3 }),
      ad({ ad_id: 'ad_3', campaign_id: 'c_2', campaign_name: 'Campanha 2', spend: 7 }),
    ]);

    await useCase.execute('client_1');

    expect(adTable.size).toBe(4);
    expect(campaignTable.size).toBe(3);
    expect(campaignTable.get(`c_1|${DAY1.toISOString()}`)).toMatchObject({
      channel: 'META_ADS', campaign_id: 'c_1', campaign_name: 'Campanha 1',
      spend: 15.5, impressions: 150, clicks: 6, conversions: 3,
    });
    expect(campaignTable.get(`c_1|${DAY2.toISOString()}`)).toMatchObject({ spend: 3 });
    expect(campaignTable.get(`c_2|${DAY1.toISOString()}`)).toMatchObject({ spend: 7 });
    // A soma das campanhas bate com a soma dos anuncios
    const sum = (m: Map<string, any>) => [...m.values()].reduce((s, r) => s + r.spend, 0);
    expect(sum(campaignTable)).toBeCloseTo(sum(adTable));
    expect(prisma.hotelApiCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred_1' },
      data: expect.objectContaining({ sync_status: 'ACTIVE', error_message: null }),
    });
  });

  it('rodar duas vezes o mesmo periodo nao duplica', async () => {
    provider.fetchAdMetrics.mockResolvedValue([ad(), ad({ ad_id: 'ad_2' })]);

    await useCase.execute('client_1');
    await useCase.execute('client_1');

    expect(adTable.size).toBe(2);
    expect(campaignTable.size).toBe(1);
    expect(campaignTable.get(`c_1|${DAY1.toISOString()}`).spend).toBe(20);
  });

  it('usa o token da credencial quando existe', async () => {
    process.env.META_SYSTEM_USER_TOKEN = 'tok_global';
    provider.fetchAdMetrics.mockResolvedValue([]);
    await useCase.execute('client_1');
    expect(provider.fetchAdMetrics).toHaveBeenCalledWith('tok_proprio', '123', undefined);
  });

  it('sem token na credencial usa o system user global', async () => {
    process.env.META_SYSTEM_USER_TOKEN = 'tok_global';
    prisma.hotelApiCredential.findUnique.mockResolvedValue({ id: 'cred_1', encrypted_token: null, meta_ad_account_id: '123' });
    provider.fetchAdMetrics.mockResolvedValue([]);

    await useCase.execute('client_1');

    expect(aes.decrypt).not.toHaveBeenCalled();
    expect(provider.fetchAdMetrics).toHaveBeenCalledWith('tok_global', '123', undefined);
  });

  it('sem token nenhum marca ERROR sem chamar a API', async () => {
    prisma.hotelApiCredential.findUnique.mockResolvedValue({ id: 'cred_1', encrypted_token: null, meta_ad_account_id: '123' });
    await useCase.execute('client_1');
    expect(provider.fetchAdMetrics).not.toHaveBeenCalled();
    expect(prisma.hotelApiCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred_1' },
      data: expect.objectContaining({ sync_status: 'ERROR' }),
    });
  });

  it('sem conta de anuncios marca ERROR', async () => {
    prisma.hotelApiCredential.findUnique.mockResolvedValue({ id: 'cred_1', encrypted_token: 'enc', meta_ad_account_id: null });
    await useCase.execute('client_1');
    expect(provider.fetchAdMetrics).not.toHaveBeenCalled();
    expect(prisma.hotelApiCredential.update.mock.calls[0][0].data.sync_status).toBe('ERROR');
  });

  it('erro fatal (token invalido) marca ERROR', async () => {
    provider.fetchAdMetrics.mockRejectedValue(new MetaAdsApiError('Meta Ads API request failed (code 190): x', 190));
    await useCase.execute('client_1');
    expect(prisma.hotelApiCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred_1' },
      data: { sync_status: 'ERROR', error_message: 'Meta Ads API request failed (code 190): x' },
    });
  });

  it('erro transitorio so registra a mensagem e continua no cron', async () => {
    provider.fetchAdMetrics.mockRejectedValue(new MetaAdsApiError('limite', 17));
    await useCase.execute('client_1');
    expect(prisma.hotelApiCredential.update).toHaveBeenCalledWith({
      where: { id: 'cred_1' },
      data: { error_message: 'limite' },
    });
  });

  it('falha ao gravar a campanha nao deixa a credencial ACTIVE', async () => {
    provider.fetchAdMetrics.mockResolvedValue([ad()]);
    campaignService.upsertMetric.mockResolvedValue({ status: 500 });
    await useCase.execute('client_1');
    const statuses = prisma.hotelApiCredential.update.mock.calls.map((c: any[]) => c[0].data.sync_status);
    expect(statuses).not.toContain('ACTIVE');
  });
});
