import axios from 'axios';
import { MetaAdsApiError, MetaAdsProvider } from './meta-ads.provider';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { __esModule: true, default: { get: jest.fn(), isAxiosError: actual.isAxiosError } };
});

const get = axios.get as jest.Mock;

function row(over: Record<string, unknown> = {}) {
  return {
    ad_id: 'ad_1', ad_name: 'Anuncio 1', adset_id: 'as_1', adset_name: 'Conjunto 1',
    campaign_id: 'c_1', campaign_name: 'Campanha 1', date_start: '2026-10-05',
    spend: '12.34', impressions: '1000', inline_link_clicks: '40', reach: '800',
    actions: [
      { action_type: 'link_click', value: '40' },
      { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '7' },
    ],
    ...over,
  };
}

/** Erro no formato que o axios lanca para uma resposta do Graph API. */
function graphError(code: number, message = 'erro') {
  const err: any = new Error('Request failed with status code 400');
  err.isAxiosError = true;
  err.response = { data: { error: { code, message } } };
  return err;
}

describe('MetaAdsProvider', () => {
  let provider: MetaAdsProvider;
  let sleep: jest.Mock;
  const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-20T00:00:00Z') };

  beforeEach(() => {
    get.mockReset();
    provider = new MetaAdsProvider();
    sleep = jest.fn().mockResolvedValue(undefined);
    (provider as any).sleep = sleep;
    jest.spyOn((provider as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((provider as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((provider as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('pede level=ad por dia e mapeia campos, cliques de link e conversas', async () => {
    get.mockResolvedValueOnce({ data: { data: [row()] } });

    const [metric] = await provider.fetchAdMetrics('tok', '123', range);

    const [url, config] = get.mock.calls[0];
    expect(url).toMatch(/\/act_123\/insights$/);
    expect(config.params).toMatchObject({
      level: 'ad', time_increment: 1, access_token: 'tok',
      time_range: JSON.stringify({ since: '2026-10-01', until: '2026-10-20' }),
    });
    expect(config.params.fields).toContain('inline_link_clicks');
    expect(metric).toEqual({
      ad_id: 'ad_1', ad_name: 'Anuncio 1', adset_id: 'as_1', adset_name: 'Conjunto 1',
      campaign_id: 'c_1', campaign_name: 'Campanha 1', date: new Date('2026-10-05'),
      spend: 12.34, impressions: 1000, clicks: 40, reach: 800, conversations: 7,
    });
  });

  it('aceita o id da conta ja com act_', async () => {
    get.mockResolvedValueOnce({ data: { data: [] } });
    await provider.fetchAdMetrics('tok', 'act_123', range);
    expect(get.mock.calls[0][0]).toMatch(/\/act_123\/insights$/);
  });

  it('segue paging.next ate acabar', async () => {
    get
      .mockResolvedValueOnce({ data: { data: [row()], paging: { next: 'https://graph/next?token=x' } } })
      .mockResolvedValueOnce({ data: { data: [row({ ad_id: 'ad_2' })] } });

    const metrics = await provider.fetchAdMetrics('tok', '123', range);

    expect(metrics.map((m) => m.ad_id)).toEqual(['ad_1', 'ad_2']);
    expect(get.mock.calls[1]).toEqual(['https://graph/next?token=x', undefined]);
  });

  it('anuncio sem conversa conta zero e linha sem ad_id e descartada', async () => {
    get.mockResolvedValueOnce({ data: { data: [row({ actions: undefined }), row({ ad_id: undefined })] } });
    const metrics = await provider.fetchAdMetrics('tok', '123', range);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].conversations).toBe(0);
  });

  it('quebra periodos longos em blocos de um mes', () => {
    expect(provider.monthChunks(new Date('2026-08-15T10:00:00Z'), new Date('2026-10-03T00:00:00Z'))).toEqual([
      { since: '2026-08-15', until: '2026-08-31' },
      { since: '2026-09-01', until: '2026-09-30' },
      { since: '2026-10-01', until: '2026-10-03' },
    ]);
  });

  it('faz uma chamada por bloco', async () => {
    get.mockResolvedValue({ data: { data: [] } });
    await provider.fetchAdMetrics('tok', '123', { from: new Date('2026-08-15T00:00:00Z'), to: new Date('2026-10-03T00:00:00Z') });
    expect(get).toHaveBeenCalledTimes(3);
  });

  it.each([17, 80004])('limite de chamadas (%i) tenta de novo com espera crescente', async (code) => {
    get
      .mockRejectedValueOnce(graphError(code))
      .mockRejectedValueOnce(graphError(code))
      .mockResolvedValueOnce({ data: { data: [row()] } });

    const metrics = await provider.fetchAdMetrics('tok', '123', range);

    expect(metrics).toHaveLength(1);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([5000, 10000]);
  });

  it('desiste do limite depois de 5 tentativas', async () => {
    get.mockRejectedValue(graphError(17));
    await expect(provider.fetchAdMetrics('tok', '123', range)).rejects.toMatchObject({ code: 17, fatal: false });
    expect(get).toHaveBeenCalledTimes(5);
  });

  it.each([190, 10, 200, 294])('codigo %i e fatal e nao tenta de novo', async (code) => {
    get.mockRejectedValueOnce(graphError(code, 'Invalid OAuth access token'));

    const error = await provider.fetchAdMetrics('tok', '123', range).catch((e) => e);

    expect(error).toBeInstanceOf(MetaAdsApiError);
    expect(error.fatal).toBe(true);
    expect(error.message).toContain(`code ${code}`);
    expect(get).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('erro de rede vira transitorio sem codigo', async () => {
    get.mockRejectedValueOnce(new Error('socket hang up'));
    await expect(provider.fetchAdMetrics('tok', '123', range)).rejects.toMatchObject({ code: null, fatal: false });
  });
});
