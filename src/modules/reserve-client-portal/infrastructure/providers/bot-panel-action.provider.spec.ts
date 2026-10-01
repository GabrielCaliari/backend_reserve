import axios from 'axios';
import * as crypto from 'crypto';
import { BotPanelActionProvider } from './bot-panel-action.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BotPanelActionProvider (contrato v2 §5)', () => {
  const config = {
    tenant_id: 'tenant_1', bot_tenant_ref: 'cli_dona_tereza',
    n8n_panel_webhook_url: 'https://n8n.example/webhook/painel', panel_webhook_secret_enc: 'cifrado',
  };
  let prisma: any;
  let aes: { decrypt: jest.Mock };
  let provider: BotPanelActionProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      botPanelAction: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'act_1', ...data })),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      botIntegrationConfig: { findUnique: jest.fn().mockResolvedValue(config) },
      botContact: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    aes = { decrypt: jest.fn().mockReturnValue('segredo-do-tenant') };
    provider = new BotPanelActionProvider(prisma, aes as any);
  });

  it('grava a acao antes de chamar o bot', async () => {
    const ordem: string[] = [];
    prisma.botPanelAction.create.mockImplementation(({ data }: any) => {
      ordem.push('gravou');
      return Promise.resolve({ id: 'act_1', ...data });
    });
    mockedAxios.post.mockImplementation(() => {
      ordem.push('chamou');
      return Promise.resolve({ data: { ok: true, state: 'ATIVO' } });
    });
    await provider.dispatch('tenant_1', 'return_to_bot', { phone: '5535999', actorId: 'usr_1' });
    expect(ordem).toEqual(['gravou', 'chamou']);
  });

  it('assina o corpo bruto com HMAC-SHA256 e manda o identificador do bot', async () => {
    mockedAxios.post.mockResolvedValue({ data: { ok: true, state: 'ATIVO' } });
    await provider.dispatch('tenant_1', 'move_stage', {
      phone: '5535999', actorId: 'usr_1', payload: { stage: 'OFERTA_FEITA', reason: null },
    });

    const [url, body, options] = mockedAxios.post.mock.calls[0] as [string, string, any];
    expect(url).toBe('https://n8n.example/webhook/painel');
    expect(JSON.parse(body)).toEqual({
      action: 'move_stage', tenant_id: 'cli_dona_tereza', phone: '5535999',
      actor_id: 'usr_1', payload: { stage: 'OFERTA_FEITA', reason: null },
    });
    const esperado = crypto.createHmac('sha256', 'segredo-do-tenant').update(body).digest('hex');
    expect(options.headers['X-Reserve-Signature']).toBe(esperado);
  });

  it('sucesso: marca SENT, guarda o estado e aplica no contato', async () => {
    mockedAxios.post.mockResolvedValue({ data: { ok: true, state: 'PAUSADO' } });
    const result = await provider.dispatch('tenant_1', 'pause_bot', { phone: '5535999' });
    expect(result).toEqual({ ok: true, state: 'PAUSADO' });
    expect(prisma.botPanelAction.update).toHaveBeenCalledWith({
      where: { id: 'act_1' },
      data: expect.objectContaining({ status: 'SENT', response_state: 'PAUSADO' }),
    });
    expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant_1', numero_contato: '5535999' },
      data: { status_bot: 'PAUSADO' },
    });
  });

  it('falha de rede: marca FAILED, conta a tentativa e nao lanca', async () => {
    mockedAxios.post.mockRejectedValue(new Error('timeout'));
    const result = await provider.dispatch('tenant_1', 'return_to_bot', { phone: '5535999' });
    expect(result).toEqual({ ok: false, state: null });
    expect(prisma.botPanelAction.update).toHaveBeenCalledWith({
      where: { id: 'act_1' },
      data: expect.objectContaining({ status: 'FAILED', attempts: { increment: 1 }, last_error: 'timeout' }),
    });
  });

  it('canal nao configurado: FAILED sem chamar ninguem', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...config, n8n_panel_webhook_url: null });
    const result = await provider.dispatch('tenant_1', 'return_to_bot', { phone: '5535999' });
    expect(result.ok).toBe(false);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('estado desconhecido na resposta nao e gravado no contato', async () => {
    mockedAxios.post.mockResolvedValue({ data: { ok: true, state: 'INVENTADO' } });
    await provider.dispatch('tenant_1', 'pause_bot', { phone: '5535999' });
    expect(prisma.botContact.updateMany).not.toHaveBeenCalled();
  });
});
