import { BotIntegrationConfigService } from './bot-integration-config.service';

describe('BotIntegrationConfigService (canal reverso do contrato v2)', () => {
  const baseRow = {
    id: 'cfg_1',
    tenant_id: 'tenant_1',
    active: true,
    tenant_key_hash: 'hash',
    tenant_key_salt: 'salt',
    n8n_stage_webhook_url: null,
    n8n_config_publish_webhook_url: null,
    chatwoot_base_url: null,
    bot_tenant_ref: null,
    n8n_panel_webhook_url: null,
    panel_webhook_secret_enc: null,
    last_heartbeat_at: null,
    created_at: new Date('2026-09-30T00:00:00Z'),
    updated_at: new Date('2026-09-30T00:00:00Z'),
  };
  let prisma: any;
  let keyProvider: { hash: jest.Mock };
  let aes: { encrypt: jest.Mock };
  let service: BotIntegrationConfigService;

  beforeEach(() => {
    prisma = {
      botIntegrationConfig: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseRow, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseRow, ...data })),
        findUnique: jest.fn(),
      },
    };
    keyProvider = { hash: jest.fn().mockReturnValue({ hash: 'h', salt: 's' }) };
    aes = { encrypt: jest.fn().mockImplementation((v: string) => `enc(${v})`) };
    service = new BotIntegrationConfigService(prisma, keyProvider as any, aes as any);
  });

  it('update: cifra o segredo, grava os campos novos e nunca devolve o segredo', async () => {
    const result = await service.update('tenant_1', {
      bot_tenant_ref: 'cli_dona_tereza',
      n8n_panel_webhook_url: 'https://n8n.example/webhook/painel',
      panel_webhook_secret: 'segredo-super-secreto-123',
    });

    expect(aes.encrypt).toHaveBeenCalledWith('segredo-super-secreto-123');
    const { data } = prisma.botIntegrationConfig.update.mock.calls[0][0];
    expect(data).toMatchObject({
      bot_tenant_ref: 'cli_dona_tereza',
      n8n_panel_webhook_url: 'https://n8n.example/webhook/painel',
      panel_webhook_secret_enc: 'enc(segredo-super-secreto-123)',
    });
    expect(data).not.toHaveProperty('panel_webhook_secret');

    expect(result).not.toHaveProperty('panel_webhook_secret_enc');
    expect(result).not.toHaveProperty('panel_webhook_secret');
    expect(JSON.stringify(result)).not.toContain('segredo-super-secreto-123');
    expect(JSON.stringify(result)).not.toContain('enc(');
    expect(result.panel_webhook_secret_set).toBe(true);
    expect(result.bot_tenant_ref).toBe('cli_dona_tereza');
    expect(result.n8n_panel_webhook_url).toBe('https://n8n.example/webhook/painel');
  });

  it('update sem segredo nao toca no segredo ja gravado', async () => {
    await service.update('tenant_1', { n8n_panel_webhook_url: 'https://n8n.example/x' });
    const { data } = prisma.botIntegrationConfig.update.mock.calls[0][0];
    expect(data).not.toHaveProperty('panel_webhook_secret_enc');
    expect(aes.encrypt).not.toHaveBeenCalled();
  });

  it('create: cifra o segredo e a resposta traz so panel_webhook_secret_set', async () => {
    const result = await service.create('tenant_1', { panel_webhook_secret: 'outro-segredo-1234567' });
    const { data } = prisma.botIntegrationConfig.create.mock.calls[0][0];
    expect(data.panel_webhook_secret_enc).toBe('enc(outro-segredo-1234567)');
    expect(result).not.toHaveProperty('panel_webhook_secret_enc');
    expect(result.panel_webhook_secret_set).toBe(true);
    expect(typeof result.tenant_key).toBe('string');
  });

  it('GET: panel_webhook_secret_set e false quando nao ha segredo', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue(baseRow);
    const result = await service.findByTenant('tenant_1');
    expect(result.panel_webhook_secret_set).toBe(false);
    expect(result).not.toHaveProperty('panel_webhook_secret_enc');
    expect(result).not.toHaveProperty('tenant_key_hash');
  });
});
