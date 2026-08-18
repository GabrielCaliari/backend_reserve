import { ChannelReconcileService } from './channel-reconcile.service';
import { Beds24RateLimitError, MotorChannelNotConnectedError } from '../../domain/errors/channel.errors';
import { utcDate } from '../../domain/constants/motor.constants';

const tenantId = 'tenant_1';

const connectedSync = {
  tenant_id: tenantId,
  refresh_token_encrypted: 'cifrado',
  status: 'OK',
  beds24_property_id: 'prop_1',
  beds24_room_id_map: { rt_1: 101 },
  last_reconcile_at: null as Date | null,
  reconcile_2x: false,
};

const remoteBooking = {
  id: 987,
  roomId: 101,
  arrival: '2026-09-05',
  departure: '2026-09-07',
  status: 'confirmed',
};

function buildDeps(syncOverrides: Partial<typeof connectedSync> = {}) {
  const sync = { ...connectedSync, ...syncOverrides };
  const prisma = {
    motorChannelSyncState: {
      findMany: jest.fn().mockResolvedValue([sync]),
      findUnique: jest.fn().mockResolvedValue(sync),
      update: jest.fn().mockResolvedValue({}),
    },
    motorReservation: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  const beds24 = {
    request: jest.fn().mockResolvedValue({ data: [remoteBooking] }),
  };
  // Rotina REAL de processamento fica no ChannelInboundService (injetado);
  // aqui um dublê com a normalizacao minima do formato Beds24.
  const inbound = {
    normalizeBooking: jest.fn().mockImplementation((raw: any) => {
      if (raw?.id == null || !raw.arrival || !raw.departure) return null;
      return {
        external_id: String(raw.id),
        arrival: raw.arrival,
        departure: raw.departure,
        cancelled: String(raw.status ?? '').toLowerCase() === 'cancelled',
      };
    }),
    applyBooking: jest
      .fn()
      .mockResolvedValue({ received: true, reservation_id: 'r_1', status: 'CONFIRMADA' }),
  };
  const botEvents = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const service = new ChannelReconcileService(
    prisma as any,
    beds24 as any,
    inbound as any,
    botEvents as any,
  );
  return { prisma, beds24, inbound, botEvents, service, sync };
}

describe('ChannelReconcileService.reconcileTenant', () => {
  it('reserva da OTA ausente localmente: corrige pela rotina do inbound, marca DIVERGENTE e alerta', async () => {
    const { prisma, inbound, botEvents, service, sync } = buildDeps();
    const result = await service.reconcileTenant(tenantId);

    // Correcao reutiliza a MESMA rotina do inbound, com forcar (pula a
    // idempotencia por modified_time — divergencia precisa ser corrigida).
    expect(inbound.applyBooking).toHaveBeenCalledWith(
      tenantId,
      sync,
      expect.objectContaining({ external_id: '987' }),
      { forcar: true },
    );
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DIVERGENTE' } }),
    );
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'canal.divergencia',
      expect.objectContaining({ corrigidas: 1, external_ids: ['987'] }),
    );
    // last_reconcile_at sempre atualizado em rodada bem-sucedida.
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { last_reconcile_at: expect.any(Date) } }),
    );
    expect(result).toEqual({ corrigidas: 1 });
  });

  it('respeita modifiedSince quando ja houve rodada anterior', async () => {
    const { beds24, service } = buildDeps({
      last_reconcile_at: new Date('2026-08-17T03:30:00Z'),
    });
    await service.reconcileTenant(tenantId);
    expect(beds24.request).toHaveBeenCalledWith(
      tenantId,
      'GET',
      `/bookings?modifiedSince=${encodeURIComponent('2026-08-17 03:30:00')}`,
    );
  });

  it('primeira rodada (sem last_reconcile_at) consulta sem modifiedSince', async () => {
    const { beds24, service } = buildDeps();
    await service.reconcileTenant(tenantId);
    expect(beds24.request).toHaveBeenCalledWith(tenantId, 'GET', '/bookings');
  });

  it('estado sao (local converge com a OTA): nada corrigido, sem DIVERGENTE, so last_reconcile_at', async () => {
    const { prisma, inbound, botEvents, service } = buildDeps();
    prisma.motorReservation.findFirst.mockResolvedValue({
      id: 'r_1',
      status: 'CONFIRMADA',
      checkin: utcDate('2026-09-05'),
      checkout: utcDate('2026-09-07'),
    });
    const result = await service.reconcileTenant(tenantId);

    expect(inbound.applyBooking).not.toHaveBeenCalled();
    expect(botEvents.dispatch).not.toHaveBeenCalled();
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledTimes(1);
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { last_reconcile_at: expect.any(Date) } }),
    );
    expect(result).toEqual({ corrigidas: 0 });
  });

  it('cancelada na OTA mas ativa localmente e divergencia: corrige', async () => {
    const { prisma, beds24, inbound, service } = buildDeps();
    beds24.request.mockResolvedValue({ data: [{ ...remoteBooking, status: 'cancelled' }] });
    prisma.motorReservation.findFirst.mockResolvedValue({
      id: 'r_1',
      status: 'CONFIRMADA',
      checkin: utcDate('2026-09-05'),
      checkout: utcDate('2026-09-07'),
    });
    const result = await service.reconcileTenant(tenantId);
    expect(inbound.applyBooking).toHaveBeenCalledWith(
      tenantId,
      expect.any(Object),
      expect.objectContaining({ external_id: '987', cancelled: true }),
      { forcar: true },
    );
    expect(result).toEqual({ corrigidas: 1 });
  });

  it('correcao ignorada pelo inbound nao conta como corrigida', async () => {
    const { prisma, inbound, botEvents, service } = buildDeps();
    inbound.applyBooking.mockResolvedValue({ received: true, ignored: true });
    const result = await service.reconcileTenant(tenantId);
    expect(result).toEqual({ corrigidas: 0 });
    expect(botEvents.dispatch).not.toHaveBeenCalled();
    expect(prisma.motorChannelSyncState.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DIVERGENTE' } }),
    );
  });

  it('tenant desconectado nao roda (erro tipado para a API admin)', async () => {
    const { beds24, service } = buildDeps({ status: 'DESCONECTADO' });
    await expect(service.reconcileTenant(tenantId)).rejects.toBeInstanceOf(
      MotorChannelNotConnectedError,
    );
    expect(beds24.request).not.toHaveBeenCalled();
  });

  it('tenant sem refresh token nao roda', async () => {
    const { beds24, service } = buildDeps({ refresh_token_encrypted: null as any });
    await expect(service.reconcileTenant(tenantId)).rejects.toBeInstanceOf(
      MotorChannelNotConnectedError,
    );
    expect(beds24.request).not.toHaveBeenCalled();
  });
});

describe('ChannelReconcileService.reconcileConnected', () => {
  it('so busca tenants conectados (refresh token presente e status != DESCONECTADO)', async () => {
    const { prisma, service } = buildDeps();
    await service.reconcileConnected(false);
    expect(prisma.motorChannelSyncState.findMany).toHaveBeenCalledWith({
      where: {
        refresh_token_encrypted: { not: null },
        status: { not: 'DESCONECTADO' },
      },
    });
  });

  it('modo reforcado (15h30) filtra reconcile_2x', async () => {
    const { prisma, service } = buildDeps();
    await service.reconcileConnected(true);
    expect(prisma.motorChannelSyncState.findMany).toHaveBeenCalledWith({
      where: {
        refresh_token_encrypted: { not: null },
        status: { not: 'DESCONECTADO' },
        reconcile_2x: true,
      },
    });
  });

  it('rate limit em um tenant nao derruba o loop dos demais', async () => {
    const { prisma, beds24, service } = buildDeps();
    const syncB = { ...connectedSync, tenant_id: 'tenant_2' };
    prisma.motorChannelSyncState.findMany.mockResolvedValue([
      { ...connectedSync },
      syncB,
    ]);
    prisma.motorChannelSyncState.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.tenant_id === 'tenant_2' ? syncB : { ...connectedSync }),
    );
    beds24.request.mockImplementation((tid: string) => {
      if (tid === tenantId) return Promise.reject(new Beds24RateLimitError(60));
      return Promise.resolve({ data: [] });
    });

    await expect(service.reconcileConnected(false)).resolves.toBeUndefined();
    // tenant_2 rodou ate o fim mesmo com o tenant_1 em rate limit.
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: 'tenant_2' },
        data: { last_reconcile_at: expect.any(Date) },
      }),
    );
    // tenant_1 falhou: nao pode ganhar last_reconcile_at (a janela nao anda).
    expect(prisma.motorChannelSyncState.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenant_id: tenantId } }),
    );
  });
});
