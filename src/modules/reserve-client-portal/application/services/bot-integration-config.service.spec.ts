import { BotIntegrationConfigService } from './bot-integration-config.service';

describe('BotIntegrationConfigService (canal reverso do contrato v2)', () => {
  const baseRow = {
    id: 'cfg_1',
    tenant_id: 'tenant_1',
    active: true,
    tenant_key_hash: 'hash',
    tenant_key_salt: 'salt',
    bot_tenant_ref: null,
    n8n_panel_webhook_url: null,
    n8n_motor_webhook_url: null,
    panel_webhook_secret_enc: null,
    last_heartbeat_at: null,
    created_at: new Date('2026-09-30T00:00:00Z'),
    updated_at: new Date('2026-09-30T00:00:00Z'),
  };
  let prisma: any;
  let keyProvider: { hash: jest.Mock };
  let aes: { encrypt: jest.Mock };
  let ingestion: { countStuck: jest.Mock };
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
    ingestion = { countStuck: jest.fn().mockResolvedValue(2) };
    service = new BotIntegrationConfigService(prisma, keyProvider as any, aes as any, ingestion as any);
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

  it('GET devolve stuck_events e nunca o segredo', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({ ...baseRow, panel_webhook_secret_enc: 'enc' });
    const r = await service.findByTenant('tenant_1');
    expect(r).toEqual(expect.objectContaining({ panel_webhook_secret_set: true, stuck_events: 2 }));
    expect(ingestion.countStuck).toHaveBeenCalledWith('tenant_1');
    expect(JSON.stringify(r)).not.toContain('enc');
    expect(r).not.toHaveProperty('tenant_key');
  });

  it('regeneratePanelSecret grava cifrado e devolve o texto uma unica vez', async () => {
    aes.encrypt.mockReturnValue('cifrado');
    const r = await service.regeneratePanelSecret('tenant_1');
    expect(r.panel_webhook_secret).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.botIntegrationConfig.update).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant_1' },
      data: { panel_webhook_secret_enc: 'cifrado' },
    });
  });

  it('create e update gravam n8n_motor_webhook_url e a resposta devolve o campo', async () => {
    const created = await service.create('tenant_1', { n8n_motor_webhook_url: 'https://n8n.example/webhook/motor' });
    expect(prisma.botIntegrationConfig.create.mock.calls[0][0].data.n8n_motor_webhook_url).toBe(
      'https://n8n.example/webhook/motor',
    );
    expect(created.n8n_motor_webhook_url).toBe('https://n8n.example/webhook/motor');

    const updated = await service.update('tenant_1', { n8n_motor_webhook_url: 'https://n8n.example/webhook/motor2' });
    expect(prisma.botIntegrationConfig.update.mock.calls[0][0].data.n8n_motor_webhook_url).toBe(
      'https://n8n.example/webhook/motor2',
    );
    expect(updated.n8n_motor_webhook_url).toBe('https://n8n.example/webhook/motor2');
  });

  it('findByTenant devolve n8n_motor_webhook_url', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue({
      ...baseRow,
      n8n_motor_webhook_url: 'https://n8n.example/webhook/motor',
    });
    const result = await service.findByTenant('tenant_1');
    expect(result.n8n_motor_webhook_url).toBe('https://n8n.example/webhook/motor');
  });

  it('string vazia nas urls grava null no create e no update (card salva com o WF9 vazio)', async () => {
    await service.create('tenant_1', { n8n_motor_webhook_url: '', n8n_panel_webhook_url: '' });
    expect(prisma.botIntegrationConfig.create.mock.calls[0][0].data).toMatchObject({
      n8n_motor_webhook_url: null,
      n8n_panel_webhook_url: null,
    });
    await service.update('tenant_1', { n8n_motor_webhook_url: '', n8n_panel_webhook_url: '', bot_tenant_ref: '' });
    expect(prisma.botIntegrationConfig.update.mock.calls[0][0].data).toMatchObject({
      n8n_motor_webhook_url: null,
      n8n_panel_webhook_url: null,
      bot_tenant_ref: null,
    });
  });

  it('rejeita url do motor invalida pela mesma regra do canal B', async () => {
    await expect(service.update('tenant_1', { n8n_motor_webhook_url: 'isso nao e url' })).rejects.toThrow();
  });
});
