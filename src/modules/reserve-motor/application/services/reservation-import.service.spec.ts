import { ReservationImportService } from './reservation-import.service';

const tenantId = 'tenant_1';

const roomTypes = [
  {
    id: 'rt_1',
    nome: 'Chale Master',
    units: [
      { id: 'u_1', identificador: 'CH-01' },
      { id: 'u_2', identificador: 'CH-02' },
    ],
  },
  { id: 'rt_2', nome: 'Suite Jardim', units: [{ id: 'u_3', identificador: 'SJ-01' }] },
];

function buildDeps({ existingRefs = [] as string[], exactDup = null as any } = {}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    motorReservation: {
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: `r_${data.external_id ?? 'new'}`, ...data })),
    },
    motorReservationEvent: { create: jest.fn().mockResolvedValue({ id: 'ev_1' }) },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    motorRoomType: { findMany: jest.fn().mockResolvedValue(roomTypes) },
    motorReservation: {
      findMany: jest
        .fn()
        .mockResolvedValue(existingRefs.map((external_id) => ({ external_id }))),
      findFirst: jest.fn().mockResolvedValue(exactDup),
    },
  };
  const availability = { freeUnitIds: jest.fn().mockResolvedValue(['u_1', 'u_2']) };
  const channelPush = { enqueue: jest.fn().mockResolvedValue(undefined) };
  return { prisma, tx, availability, channelPush };
}

function linha(overrides: Record<string, unknown> = {}) {
  return {
    checkin: '2026-09-10',
    checkout: '2026-09-12',
    hospede_nome: 'Maria',
    room_type_nome: 'Chale Master',
    origem: 'SITE_HSYSTEM',
    ...overrides,
  } as any;
}

describe('ReservationImportService: dry-run (padrao)', () => {
  it('valida linha a linha e NAO grava nada', async () => {
    const { prisma, tx, availability, channelPush } = buildDeps();
    const service = new ReservationImportService(prisma as any, availability as any, channelPush as any);
    const result = await service.import(
      tenantId,
      {
        linhas: [
          linha({ external_ref: 'HB-1' }),
          linha({ hospede_nome: 'Joao', room_type_nome: 'suite jardim', external_ref: 'HB-2' }),
          linha({ room_type_nome: 'Chale Inexistente', external_ref: 'HB-3' }),
        ],
      } as any,
      'admin_1',
    );
    expect(result.commit).toBe(false);
    expect(result.linhas.map((l) => l.resultado)).toEqual(['ok', 'ok', 'room_type_desconhecido']);
    expect(result.resumo).toEqual({ total: 3, ok: 2, gravadas: 0, conflitos: 0, duplicadas: 0, erros: 1 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.motorReservation.create).not.toHaveBeenCalled();
    expect(channelPush.enqueue).not.toHaveBeenCalled();
  });

  it('resolve room_type por nome e unit por identificador case-insensitive', async () => {
    const { prisma, availability } = buildDeps();
    const service = new ReservationImportService(prisma as any, availability as any);
    const result = await service.import(
      tenantId,
      {
        linhas: [
          linha({ room_type_nome: 'CHALE master', unit_identificador: 'ch-02', external_ref: 'HB-1' }),
          linha({ unit_identificador: 'CH-99', external_ref: 'HB-2' }),
        ],
      } as any,
      'admin_1',
    );
    expect(result.linhas[0].resultado).toBe('ok');
    expect(result.linhas[1].resultado).toBe('unit_desconhecida');
  });

  it('duas linhas disputando a ultima unit: a segunda conflita ja no dry-run', async () => {
    const { prisma, availability } = buildDeps();
    availability.freeUnitIds.mockResolvedValue(['u_1']);
    const service = new ReservationImportService(prisma as any, availability as any);
    const result = await service.import(
      tenantId,
      { linhas: [linha({ external_ref: 'HB-1' }), linha({ external_ref: 'HB-2' })] } as any,
      'admin_1',
    );
    expect(result.linhas.map((l) => l.resultado)).toEqual(['ok', 'conflito']);
  });

  it('linha invalida (checkout <= checkin) e duplicata exata sem external_ref', async () => {
    const { prisma, availability } = buildDeps({ exactDup: { id: 'r_1' } });
    const service = new ReservationImportService(prisma as any, availability as any);
    const result = await service.import(
      tenantId,
      { linhas: [linha({ checkout: '2026-09-10' }), linha()] } as any,
      'admin_1',
    );
    expect(result.linhas[0].resultado).toBe('invalida');
    expect(result.linhas[1].resultado).toBe('duplicada');
    expect(result.resumo.duplicadas).toBe(1);
    expect(result.resumo.erros).toBe(1);
  });
});

describe('ReservationImportService: commit', () => {
  it('grava com lock, status CONFIRMADA, external_id e evento CRIADA { import: true }', async () => {
    const { prisma, tx, availability, channelPush } = buildDeps();
    const service = new ReservationImportService(prisma as any, availability as any, channelPush as any);
    const result = await service.import(
      tenantId,
      { commit: true, linhas: [linha({ external_ref: 'HB-1', valor_total: 900 })] } as any,
      'admin_1',
    );
    expect(result.linhas[0]).toEqual(
      expect.objectContaining({ resultado: 'ok', reservation_id: 'r_HB-1' }),
    );
    expect(result.resumo).toEqual({ total: 1, ok: 1, gravadas: 1, conflitos: 0, duplicadas: 0, erros: 0 });
    expect(tx.$queryRaw).toHaveBeenCalled(); // FOR UPDATE dentro da transacao
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMADA',
          origem: 'SITE_HSYSTEM',
          external_id: 'HB-1',
          valor_total: 900,
          saldo_checkin: 900,
        }),
      }),
    );
    expect(tx.motorReservationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'CRIADA',
          payload: { import: true, external_ref: 'HB-1' },
        }),
      }),
    );
    expect(channelPush.enqueue).toHaveBeenCalledWith(tenantId, 'rt_1', expect.any(Date), expect.any(Date));
  });

  it('reimportar o mesmo export e idempotente: external_ref conhecido vira duplicada', async () => {
    const { prisma, tx, availability } = buildDeps({ existingRefs: ['HB-1'] });
    const service = new ReservationImportService(prisma as any, availability as any);
    const result = await service.import(
      tenantId,
      {
        commit: true,
        linhas: [linha({ external_ref: 'HB-1' }), linha({ hospede_nome: 'Joao', external_ref: 'HB-2' })],
      } as any,
      'admin_1',
    );
    expect(result.linhas.map((l) => l.resultado)).toEqual(['duplicada', 'ok']);
    expect(result.resumo.gravadas).toBe(1);
    expect(tx.motorReservation.create).toHaveBeenCalledTimes(1);
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ external_id: 'HB-2' }) }),
    );
  });

  it('conflito de datas reporta a linha sem abortar as demais', async () => {
    const { prisma, tx, availability } = buildDeps();
    availability.freeUnitIds.mockResolvedValueOnce([]).mockResolvedValueOnce(['u_1']);
    const service = new ReservationImportService(prisma as any, availability as any);
    const result = await service.import(
      tenantId,
      {
        commit: true,
        linhas: [linha({ external_ref: 'HB-1' }), linha({ hospede_nome: 'Joao', external_ref: 'HB-2' })],
      } as any,
      'admin_1',
    );
    expect(result.linhas.map((l) => l.resultado)).toEqual(['conflito', 'ok']);
    expect(result.resumo).toEqual({ total: 2, ok: 1, gravadas: 1, conflitos: 1, duplicadas: 0, erros: 0 });
    expect(tx.motorReservation.create).toHaveBeenCalledTimes(1);
  });

  it('unit informada restringe a alocacao aquela unit', async () => {
    const { prisma, tx, availability } = buildDeps();
    const service = new ReservationImportService(prisma as any, availability as any);
    await service.import(
      tenantId,
      { commit: true, linhas: [linha({ unit_identificador: 'CH-02', external_ref: 'HB-1' })] } as any,
      'admin_1',
    );
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unit_id: 'u_2' }) }),
    );
  });
});
