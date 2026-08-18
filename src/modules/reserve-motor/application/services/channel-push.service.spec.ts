import { ChannelPushService } from './channel-push.service';
import { Beds24RateLimitError } from '../../domain/errors/channel.errors';
import { addDaysUtc, isoDate, utcDate } from '../../domain/constants/motor.constants';

const tenantId = 'tenant_1';
const today = utcDate(new Date().toISOString().slice(0, 10));
const d = (offset: number) => addDaysUtc(today, offset);

function buildDeps(overrides: Partial<Record<string, any>> = {}) {
  const prisma = {
    motorChannelPushQueue: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'q_1' }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    motorChannelSyncState: {
      findUnique: jest.fn().mockResolvedValue({
        tenant_id: tenantId,
        beds24_property_id: 'prop_1',
        beds24_room_id_map: { rt_1: 101, rt_2: 202 },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    motorDailyInventory: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  const availability = { freeCountByNight: jest.fn().mockResolvedValue(new Map()) };
  const beds24 = { request: jest.fn().mockResolvedValue({ success: true }) };
  const botEvents = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const service = new ChannelPushService(
    prisma as any,
    availability as any,
    beds24 as any,
    botEvents as any,
  );
  return { prisma, availability, beds24, botEvents, service };
}

describe('ChannelPushService.enqueue', () => {
  it('coalesce: item PENDENTE do mesmo tenant/room_type so expande o range', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorChannelPushQueue.findFirst.mockResolvedValue({
      id: 'q_1',
      range_inicio: d(5),
      range_fim: d(7),
    });
    await service.enqueue(tenantId, 'rt_1', d(3), d(6));
    expect(prisma.motorChannelPushQueue.create).not.toHaveBeenCalled();
    expect(prisma.motorChannelPushQueue.update).toHaveBeenCalledWith({
      where: { id: 'q_1' },
      data: { range_inicio: d(3), range_fim: d(7) },
    });
  });

  it('sem item PENDENTE cria um novo', async () => {
    const { prisma, service } = buildDeps();
    await service.enqueue(tenantId, 'rt_1', d(3), d(6));
    expect(prisma.motorChannelPushQueue.create).toHaveBeenCalledWith({
      data: { tenant_id: tenantId, room_type_id: 'rt_1', range_inicio: d(3), range_fim: d(6) },
    });
  });

  it('fire-and-forget: erro no banco e engolido com log, nunca propaga', async () => {
    const { prisma, service } = buildDeps();
    prisma.motorChannelPushQueue.findFirst.mockRejectedValue(new Error('db down'));
    await expect(service.enqueue(tenantId, 'rt_1', d(3), d(6))).resolves.toBeUndefined();
  });
});

describe('ChannelPushService.drain', () => {
  function queueItem(overrides: Partial<Record<string, any>> = {}) {
    return {
      id: 'q_1',
      tenant_id: tenantId,
      room_type_id: 'rt_1',
      range_inicio: d(1),
      range_fim: d(4),
      status: 'PENDENTE',
      attempts: 0,
      not_before: null,
      created_at: new Date(),
      ...overrides,
    };
  }

  it('monta UM POST /inventory/rooms/calendar por tenant com segmentos coalescidos — nunca uma chamada por dia', async () => {
    const { prisma, availability, beds24, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([
      queueItem(),
      queueItem({ id: 'q_2', room_type_id: 'rt_2' }),
    ]);
    availability.freeCountByNight.mockResolvedValue(
      new Map([
        [isoDate(d(1)), 2],
        [isoDate(d(2)), 2],
        [isoDate(d(3)), 1], // muda numAvail -> quebra segmento
      ]),
    );
    prisma.motorDailyInventory.findMany.mockResolvedValue([
      { data: d(1), preco: 339, min_stay: 2, stop_sell: false },
      { data: d(2), preco: 339, min_stay: 2, stop_sell: false },
      { data: d(3), preco: 339, min_stay: 2, stop_sell: false },
    ]);

    await service.drain();

    expect(beds24.request).toHaveBeenCalledTimes(1);
    const [calledTenant, method, path, payload] = beds24.request.mock.calls[0];
    expect(calledTenant).toBe(tenantId);
    expect(method).toBe('POST');
    expect(path).toBe('/inventory/rooms/calendar');
    expect(payload).toHaveLength(2); // um item por quarto, no MESMO POST
    expect(payload[0].roomId).toBe(101);
    expect(payload[0].calendar).toEqual([
      { from: isoDate(d(1)), to: isoDate(d(2)), numAvail: 2, price1: 339, minStay: 2 },
      { from: isoDate(d(3)), to: isoDate(d(3)), numAvail: 1, price1: 339, minStay: 2 },
    ]);
    expect(payload[1].roomId).toBe(202);
    // Sucesso: itens ENVIADO + last_push_at no sync state.
    expect(prisma.motorChannelPushQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['q_1', 'q_2'] } },
        data: expect.objectContaining({ status: 'ENVIADO' }),
      }),
    );
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ last_push_at: expect.any(Date) }) }),
    );
  });

  it('numAvail considera holds ativos (usa freeCountByNight do AvailabilityService)', async () => {
    const { prisma, availability, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([queueItem()]);
    await service.drain();
    expect(availability.freeCountByNight).toHaveBeenCalledWith(tenantId, 'rt_1', d(1), d(4));
  });

  it('dia sem inventario ou com stop_sell vai como numAvail 0 sem preco', async () => {
    const { prisma, availability, beds24, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([
      queueItem({ range_fim: d(3) }), // 2 noites
    ]);
    availability.freeCountByNight.mockResolvedValue(
      new Map([
        [isoDate(d(1)), 2],
        [isoDate(d(2)), 2],
      ]),
    );
    prisma.motorDailyInventory.findMany.mockResolvedValue([
      { data: d(1), preco: 339, min_stay: 1, stop_sell: true },
      // d(2) sem linha de inventario
    ]);
    await service.drain();
    const payload = beds24.request.mock.calls[0][3];
    expect(payload[0].calendar).toEqual([
      { from: isoDate(d(1)), to: isoDate(d(2)), numAvail: 0 },
    ]);
  });

  it('tenant sem property/room map: itens fechados como ENVIADO sem chamada (fila nao acumula)', async () => {
    const { prisma, beds24, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([queueItem()]);
    prisma.motorChannelSyncState.findUnique.mockResolvedValue({ tenant_id: tenantId });
    await service.drain();
    expect(beds24.request).not.toHaveBeenCalled();
    expect(prisma.motorChannelPushQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ENVIADO' }) }),
    );
  });

  it('429: attempts++ e not_before com backoff de 1min na primeira falha', async () => {
    const { prisma, beds24, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([queueItem()]);
    beds24.request.mockRejectedValue(new Beds24RateLimitError(null));
    const before = Date.now();
    await service.drain();
    const update = prisma.motorChannelPushQueue.update.mock.calls[0][0];
    expect(update.data.attempts).toBe(1);
    const delayMin = (update.data.not_before.getTime() - before) / 60_000;
    expect(delayMin).toBeGreaterThan(0.9);
    expect(delayMin).toBeLessThan(1.1);
  });

  it('backoff cresce 1 -> 4 -> 15 minutos com as tentativas', async () => {
    const { prisma, beds24, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([queueItem({ attempts: 2 })]);
    beds24.request.mockRejectedValue(new Beds24RateLimitError(null));
    const before = Date.now();
    await service.drain();
    const update = prisma.motorChannelPushQueue.update.mock.calls[0][0];
    expect(update.data.attempts).toBe(3);
    const delayMin = (update.data.not_before.getTime() - before) / 60_000;
    expect(delayMin).toBeGreaterThan(14.9);
    expect(delayMin).toBeLessThan(15.1);
  });

  it('5a falha: item vira ERRO, sync state marca ERRO e equipe e alertada', async () => {
    const { prisma, beds24, botEvents, service } = buildDeps();
    prisma.motorChannelPushQueue.findMany.mockResolvedValue([queueItem({ attempts: 4 })]);
    beds24.request.mockRejectedValue(new Error('beds24 fora do ar'));
    await service.drain();
    expect(prisma.motorChannelPushQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ERRO', attempts: 5 }) }),
    );
    expect(prisma.motorChannelSyncState.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ERRO' } }),
    );
    expect(botEvents.dispatch).toHaveBeenCalledWith(
      tenantId,
      'canal.push.erro',
      expect.any(Object),
    );
  });

  it('respeita not_before: busca so itens vencidos', async () => {
    const { prisma, service } = buildDeps();
    await service.drain();
    const where = prisma.motorChannelPushQueue.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDENTE');
    expect(where.OR).toEqual([
      { not_before: null },
      { not_before: { lte: expect.any(Date) } },
    ]);
  });
});
