import axios from 'axios';
import * as crypto from 'crypto';
import { MotorBotEventsProvider } from './motor-bot-events.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MotorBotEventsProvider (outbox assinada motor -> bot)', () => {
  const config = {
    active: true,
    bot_tenant_ref: 'cli_dona_tereza',
    n8n_motor_webhook_url: 'https://n8n.example/webhook/motor',
    panel_webhook_secret_enc: 'cifrado',
  };
  let prisma: any;
  let aes: { decrypt: jest.Mock };
  let provider: MotorBotEventsProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      motorBotEvent: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'evt_1', ...data })),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      botIntegrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
    };
    aes = { decrypt: jest.fn().mockReturnValue('segredo-do-canal-b') };
    provider = new MotorBotEventsProvider(prisma, aes as any);
  });

  it('grava o evento PENDING antes de chamar a URL', async () => {
    const ordem: string[] = [];
    prisma.motorBotEvent.create.mockImplementation(({ data }: any) => {
      ordem.push('gravou');
      return Promise.resolve({ id: 'evt_1', ...data });
    });
    mockedAxios.post.mockImplementation(() => {
      ordem.push('chamou');
      return Promise.resolve({ status: 200, data: {} });
    });
    await provider.dispatch('tenant_1', 'hold.expirado', { hold_id: 'h1' });
    expect(ordem).toEqual(['gravou', 'chamou']);
    expect(prisma.motorBotEvent.create).toHaveBeenCalledWith({
      data: { tenant_id: 'tenant_1', evento: 'hold.expirado', payload: { hold_id: 'h1' }, status: 'PENDING' },
    });
  });

  it('assina o corpo exato com HMAC-SHA256 e manda event_id da linha', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
    await provider.dispatch('tenant_1', 'hold.expirado', { hold_id: 'h1' });

    const [url, body, options] = mockedAxios.post.mock.calls[0] as [string, string, any];
    expect(url).toBe('https://n8n.example/webhook/motor');
    expect(JSON.parse(body)).toEqual({
      event_id: 'evt_1', evento: 'hold.expirado', tenant_id: 'cli_dona_tereza', hold_id: 'h1',
    });
    const esperado = crypto.createHmac('sha256', 'segredo-do-canal-b').update(body).digest('hex');
    expect(options.headers['X-Reserve-Signature']).toBe(esperado);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.timeout).toBe(5000);
  });

  it('usa o id do tenant quando nao ha bot_tenant_ref', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...config, bot_tenant_ref: null });
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
    await provider.dispatch('tenant_1', 'x', {});
    expect(JSON.parse((mockedAxios.post.mock.calls[0] as any)[1]).tenant_id).toBe('tenant_1');
  });

  it('sucesso marca SENT', async () => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
    await provider.dispatch('tenant_1', 'hold.expirado', {});
    expect(prisma.motorBotEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
      data: expect.objectContaining({ status: 'SENT', last_error: null }),
    });
  });

  it('erro de rede marca FAILED, conta a tentativa e nunca lanca', async () => {
    mockedAxios.post.mockRejectedValue(new Error('timeout'));
    await expect(provider.dispatch('tenant_1', 'hold.expirado', {})).resolves.toBeUndefined();
    expect(prisma.motorBotEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
      data: expect.objectContaining({ status: 'FAILED', attempts: { increment: 1 }, last_error: 'timeout' }),
    });
  });

  it('HTTP >= 400 marca FAILED', async () => {
    mockedAxios.post.mockResolvedValue({ status: 502, data: {} });
    await provider.dispatch('tenant_1', 'hold.expirado', {});
    expect(prisma.motorBotEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
      data: expect.objectContaining({ status: 'FAILED', last_error: 'HTTP 502' }),
    });
  });

  it('sem URL ou integracao inativa nao grava nada e nao chama', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...config, n8n_motor_webhook_url: null });
    await provider.dispatch('tenant_1', 'x', {});
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...config, active: false });
    await provider.dispatch('tenant_1', 'x', {});
    prisma.botIntegrationConfig.findUnique.mockResolvedValue(null);
    await provider.dispatch('tenant_1', 'x', {});
    expect(prisma.motorBotEvent.create).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('sem segredo do canal B grava FAILED e nao chama', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...config, panel_webhook_secret_enc: null });
    await provider.dispatch('tenant_1', 'x', {});
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(prisma.motorBotEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
      data: expect.objectContaining({ status: 'FAILED', last_error: 'segredo do canal B ausente' }),
    });
  });

  it('retry reenvia o MESMO event_id', async () => {
    prisma.motorBotEvent.findUnique.mockResolvedValue({
      id: 'evt_9', tenant_id: 'tenant_1', evento: 'hold.expirado', payload: { hold_id: 'h9' }, status: 'FAILED',
    });
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
    await expect(provider.retry('evt_9')).resolves.toBe(true);
    expect(JSON.parse((mockedAxios.post.mock.calls[0] as any)[1]).event_id).toBe('evt_9');
    expect(prisma.motorBotEvent.create).not.toHaveBeenCalled();
  });

  it('retry de evento inexistente devolve false', async () => {
    prisma.motorBotEvent.findUnique.mockResolvedValue(null);
    await expect(provider.retry('nada')).resolves.toBe(false);
  });
});
