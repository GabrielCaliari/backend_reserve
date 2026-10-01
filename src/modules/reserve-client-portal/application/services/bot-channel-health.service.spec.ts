import { BotChannelHealthService } from './bot-channel-health.service';

describe('BotChannelHealthService (contrato v2 §4.5)', () => {
  function build(lastHeartbeatAt: Date | null, data: unknown) {
    const prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botIntegrationConfig: {
        findUnique: jest.fn().mockResolvedValue({ active: true, last_heartbeat_at: lastHeartbeatAt, last_heartbeat_data: data }),
      },
      hotelApiCredential: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    return new BotChannelHealthService(prisma as any);
  }

  it('heartbeat recente: conectado, com os numeros que o bot informou', async () => {
    const service = build(new Date(Date.now() - 60_000), {
      bot_enabled: true, mode: 'hospedin', ai_enabled: false,
      active_conversations: 7, paused_awaiting_human: 2,
      last_echo_at: '2026-10-01T10:00:00.000Z', last_polling_at: '2026-10-01T10:01:00.000Z',
    });
    const { whatsapp } = await service.getChannels('client_1');
    expect(whatsapp).toMatchObject({
      connected: true, botEnabled: true, heartbeatStale: false, heartbeatAgeMinutes: 1,
      activeConversations: 7, pausedAwaitingHuman: 2,
      mode: 'hospedin', aiEnabled: false,
      lastEchoAt: '2026-10-01T10:00:00.000Z', lastPollingAt: '2026-10-01T10:01:00.000Z',
    });
  });

  it('heartbeat com mais de 5 minutos: desconectado e stale', async () => {
    const service = build(new Date(Date.now() - 6 * 60_000), { bot_enabled: true });
    const { whatsapp } = await service.getChannels('client_1');
    expect(whatsapp.connected).toBe(false);
    expect(whatsapp.heartbeatStale).toBe(true);
  });

  it('sem heartbeat nenhum: tudo zerado, sem quebrar', async () => {
    const service = build(null, null);
    const { whatsapp } = await service.getChannels('client_1');
    expect(whatsapp).toMatchObject({
      connected: false, botEnabled: false, heartbeatAgeMinutes: null, heartbeatStale: true,
      activeConversations: 0, pausedAwaitingHuman: 0, mode: null, aiEnabled: null,
    });
  });
});
