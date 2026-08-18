import { ServiceUnavailableException } from '@nestjs/common';
import { ChannelAdminService } from './channel-admin.service';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';

function syncRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'cs_1',
    tenant_id: tenantId,
    status: 'OK',
    reconcile_2x: false,
    beds24_property_id: 'prop_1',
    beds24_room_id_map: { rt_1: 101 },
    refresh_token_encrypted: 'cifrado-nunca-sai',
    webhook_secret: 'segredo-nunca-sai',
    last_push_at: new Date('2026-08-18T10:00:00Z'),
    last_webhook_at: new Date('2026-08-18T11:00:00Z'),
    last_reconcile_at: new Date('2026-08-18T03:30:00Z'),
    ...overrides,
  };
}

function buildDeps(overrides: Partial<Record<string, any>> = {}) {
  const prisma = {
    motorChannelSyncState: {
      findUnique: jest.fn().mockResolvedValue(syncRow()),
      update: jest.fn().mockImplementation(async ({ data }: any) => syncRow(data)),
      upsert: jest.fn().mockImplementation(async ({ update }: any) => syncRow(update)),
    },
    motorChannelPushQueue: { findMany: jest.fn().mockResolvedValue([]) },
    motorRoomType: { findMany: jest.fn().mockResolvedValue([{ id: 'rt_1' }]) },
    ...overrides,
  };
  const beds24 = { connect: jest.fn().mockResolvedValue(undefined) };
  const reconcile = { reconcileTenant: jest.fn().mockResolvedValue({ corrigidas: 2 }) };
  const service = new ChannelAdminService(prisma as any, beds24 as any, reconcile as any);
  return { prisma, beds24, reconcile, service };
}

describe('ChannelAdminService.overview', () => {
  it('devolve estado + fila de ERRO sem nunca expor refresh token ou webhook secret', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([
      {
        id: 'q_9',
        room_type_id: 'rt_1',
        range_inicio: new Date('2026-09-01'),
        range_fim: new Date('2026-09-05'),
        attempts: 5,
        status: 'ERRO',
      },
    ]);
    const result = await service.overview(tenantId);
    expect(result.status).toBe('OK');
    expect(result.conectado).toBe(true);
    expect(result.beds24_property_id).toBe('prop_1');
    expect(result.beds24_room_id_map).toEqual({ rt_1: 101 });
    expect(result.fila_erros).toEqual([
      {
        id: 'q_9',
        room_type_id: 'rt_1',
        range_inicio: new Date('2026-09-01'),
        range_fim: new Date('2026-09-05'),
        attempts: 5,
      },
    ]);
    expect(prisma.motorChannelPushQueue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenant_id: tenantId, status: 'ERRO' } }),
    );
    // Shape seguro: os segredos NUNCA aparecem em leitura.
    expect(JSON.stringify(result)).not.toContain('cifrado-nunca-sai');
    expect(JSON.stringify(result)).not.toContain('segredo-nunca-sai');
    expect(result).not.toHaveProperty('refresh_token_encrypted');
    expect(result).not.toHaveProperty('webhook_secret');
  });

  it('sem sync state reporta DESCONECTADO (estado zero, nao 404)', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorChannelSyncState.findUnique.mockResolvedValue(null);
    const result = await service.overview(tenantId);
    expect(result.status).toBe('DESCONECTADO');
    expect(result.conectado).toBe(false);
    expect(result.beds24_property_id).toBeNull();
    expect(result.fila_erros).toEqual([]);
  });
});

describe('ChannelAdminService.connect', () => {
  it('chama o provider, grava property id + webhook secret e devolve o segredo UMA vez', async () => {
    const { prisma, beds24, service } = buildDeps();
    const result = await service.connect(tenantId, {
      invite_code: 'invite-abc',
      beds24_property_id: 'prop_9',
    });
    expect(beds24.connect).toHaveBeenCalledWith(tenantId, 'invite-abc');
    const updateArg = prisma.motorChannelSyncState.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ tenant_id: tenantId });
    expect(updateArg.data.beds24_property_id).toBe('prop_9');
    expect(updateArg.data.status).toBe('OK');
    // Segredo gerado com crypto.randomBytes(32).hex e devolvido na resposta.
    expect(updateArg.data.webhook_secret).toMatch(/^[0-9a-f]{64}$/);
    expect(result.webhook_secret).toBe(updateArg.data.webhook_secret);
    expect(result.status).toBe('OK');
    expect(result).not.toHaveProperty('refresh_token_encrypted');
  });
});

describe('ChannelAdminService.saveRoomMap', () => {
  it('grava o mapa quando todos os room_types pertencem ao tenant', async () => {
    const { prisma, service } = buildDeps();
    const result = await service.saveRoomMap(tenantId, { rt_1: 101 });
    expect(prisma.motorRoomType.findMany).toHaveBeenCalledWith({
      where: { tenant_id: tenantId, id: { in: ['rt_1'] } },
      select: { id: true },
    });
    expect(prisma.motorChannelSyncState.upsert).toHaveBeenCalledWith({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, beds24_room_id_map: { rt_1: 101 } },
      update: { beds24_room_id_map: { rt_1: 101 } },
    });
    expect(result).not.toHaveProperty('webhook_secret');
  });

  it('room_type fora do tenant -> MotorNotFoundError (404 via filtro)', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorRoomType.findMany.mockResolvedValue([{ id: 'rt_1' }]);
    await expect(service.saveRoomMap(tenantId, { rt_1: 101, rt_alheio: 202 })).rejects.toThrow(
      MotorNotFoundError,
    );
    expect(prisma.motorChannelSyncState.upsert).not.toHaveBeenCalled();
  });

  it('beds24 roomId nao numerico -> MotorValidationError', async () => {
    const { service } = buildDeps();
    await expect(service.saveRoomMap(tenantId, { rt_1: 'abc' })).rejects.toThrow(
      MotorValidationError,
    );
  });
});

describe('ChannelAdminService.setReconcile2x', () => {
  it('liga e desliga a flag no sync state', async () => {
    const { prisma, service } = buildDeps();
    const result = await service.setReconcile2x(tenantId, true);
    expect(prisma.motorChannelSyncState.upsert).toHaveBeenCalledWith({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, reconcile_2x: true },
      update: { reconcile_2x: true },
    });
    expect(result.reconcile_2x).toBe(true);
  });
});

describe('ChannelAdminService.reconcileNow', () => {
  it('delega a porta CHANNEL_RECONCILE', async () => {
    const { reconcile, service } = buildDeps();
    await expect(service.reconcileNow(tenantId)).resolves.toEqual({ corrigidas: 2 });
    expect(reconcile.reconcileTenant).toHaveBeenCalledWith(tenantId);
  });

  it('sem a porta registrada responde 503 (branch compila sozinho, merge liga as pontas)', async () => {
    const prisma = {
      motorChannelSyncState: { findUnique: jest.fn() },
      motorChannelPushQueue: { findMany: jest.fn() },
      motorRoomType: { findMany: jest.fn() },
    };
    const service = new ChannelAdminService(prisma as any, { connect: jest.fn() } as any);
    await expect(service.reconcileNow(tenantId)).rejects.toThrow(ServiceUnavailableException);
  });
});
