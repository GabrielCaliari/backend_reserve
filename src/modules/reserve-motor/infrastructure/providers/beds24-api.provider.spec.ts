import { Beds24ApiProvider, BEDS24_BASE_URL } from './beds24-api.provider';
import {
  Beds24RateLimitError,
  MotorChannelAuthError,
  MotorChannelNotConnectedError,
} from '../../domain/errors/channel.errors';

const tenantId = 'tenant_1';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: jest.fn().mockResolvedValue(body),
  };
}

function buildDeps() {
  const prisma = {
    motorChannelSyncState: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({
        tenant_id: tenantId,
        refresh_token_encrypted: 'enc:refresh',
      }),
    },
  };
  const aes = {
    encrypt: jest.fn().mockImplementation((v: string) => `enc:${v}`),
    decrypt: jest.fn().mockImplementation((v: string) => v.replace(/^enc:/, '')),
  };
  return { prisma, aes };
}

describe('Beds24ApiProvider.connect', () => {
  afterEach(() => jest.restoreAllMocks());

  it('troca o invite code no /authentication/setup e persiste o refresh token CIFRADO', async () => {
    const { prisma, aes } = buildDeps();
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue(
        jsonResponse(200, { token: 'acc_1', expiresIn: 86400, refreshToken: 'refresh_1' }) as any,
      );
    const provider = new Beds24ApiProvider(prisma as any, aes as any);
    await provider.connect(tenantId, 'invite_abc');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BEDS24_BASE_URL}/authentication/setup`,
      expect.objectContaining({ headers: { code: 'invite_abc' } }),
    );
    expect(aes.encrypt).toHaveBeenCalledWith('refresh_1');
    expect(prisma.motorChannelSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: tenantId },
        create: expect.objectContaining({ refresh_token_encrypted: 'enc:refresh_1', status: 'OK' }),
      }),
    );
    // O invite code nao pode aparecer em NENHUM dado persistido.
    const upsertArg = JSON.stringify(prisma.motorChannelSyncState.upsert.mock.calls[0][0]);
    expect(upsertArg).not.toContain('invite_abc');
  });

  it('invite code invalido -> MotorChannelAuthError, nada persistido', async () => {
    const { prisma, aes } = buildDeps();
    jest.spyOn(global, 'fetch' as any).mockResolvedValue(jsonResponse(401, {}) as any);
    const provider = new Beds24ApiProvider(prisma as any, aes as any);
    await expect(provider.connect(tenantId, 'ruim')).rejects.toBeInstanceOf(MotorChannelAuthError);
    expect(prisma.motorChannelSyncState.upsert).not.toHaveBeenCalled();
  });
});

describe('Beds24ApiProvider.getAccessToken', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renova via /authentication/token com o refresh DECIFRADO e cacheia por tenant', async () => {
    const { prisma, aes } = buildDeps();
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue(jsonResponse(200, { token: 'acc_2', expiresIn: 3600 }) as any);
    const provider = new Beds24ApiProvider(prisma as any, aes as any);

    const first = await provider.getAccessToken(tenantId);
    const second = await provider.getAccessToken(tenantId);

    expect(first).toBe('acc_2');
    expect(second).toBe('acc_2');
    expect(aes.decrypt).toHaveBeenCalledWith('enc:refresh');
    expect(fetchMock).toHaveBeenCalledTimes(1); // cache em memoria segurou a 2a chamada
    expect(fetchMock).toHaveBeenCalledWith(
      `${BEDS24_BASE_URL}/authentication/token`,
      expect.objectContaining({ headers: { refreshToken: 'refresh' } }),
    );
  });

  it('tenant sem refresh token -> MotorChannelNotConnectedError', async () => {
    const { prisma, aes } = buildDeps();
    prisma.motorChannelSyncState.findUnique.mockResolvedValue(null);
    const provider = new Beds24ApiProvider(prisma as any, aes as any);
    await expect(provider.getAccessToken(tenantId)).rejects.toBeInstanceOf(
      MotorChannelNotConnectedError,
    );
  });
});

describe('Beds24ApiProvider.request', () => {
  afterEach(() => jest.restoreAllMocks());

  it('manda o access token no header e devolve o JSON', async () => {
    const { prisma, aes } = buildDeps();
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(jsonResponse(200, { token: 'acc_3', expiresIn: 3600 }) as any)
      .mockResolvedValueOnce(jsonResponse(200, { success: true }) as any);
    const provider = new Beds24ApiProvider(prisma as any, aes as any);

    const result = await provider.request(tenantId, 'POST', '/inventory/rooms/calendar', [{ roomId: 1 }]);

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BEDS24_BASE_URL}/inventory/rooms/calendar`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ token: 'acc_3' }),
        body: JSON.stringify([{ roomId: 1 }]),
      }),
    );
  });

  it('429 -> Beds24RateLimitError tipado com retry-after sugerido', async () => {
    const { prisma, aes } = buildDeps();
    jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(jsonResponse(200, { token: 'acc_4', expiresIn: 3600 }) as any)
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '120' }) as any);
    const provider = new Beds24ApiProvider(prisma as any, aes as any);

    const error = await provider
      .request(tenantId, 'POST', '/inventory/rooms/calendar', [])
      .catch((e) => e);
    expect(error).toBeInstanceOf(Beds24RateLimitError);
    expect((error as Beds24RateLimitError).retryAfterSeconds).toBe(120);
  });
});
