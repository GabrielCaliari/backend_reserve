import { ReservationService } from './reservation.service';
import { MotorNotFoundError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';
const DAY = 24 * 60 * 60 * 1000;

function futureDate(days: number): Date {
  const d = new Date(Date.now() + days * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function buildDeps(reservation: any, freeUnits: string[] = ['u_2']) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    motorReservation: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r_new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...reservation, ...data })),
    },
    motorReservationEvent: {
      create: jest.fn().mockResolvedValue({ id: 'ev_1' }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    motorReservation: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(reservation),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...reservation, ...data })),
    },
    motorReservationEvent: { create: jest.fn().mockResolvedValue({ id: 'ev_1' }) },
    motorCancellationPolicy: {
      findFirst: jest.fn().mockResolvedValue({
        dias_antecedencia_remarcacao: 7,
        reembolso_apos_prazo: false,
        taxa_noshow_percent: 100,
      }),
    },
  };
  const availability = {
    quote: jest.fn().mockResolvedValue({ valor_total: 800, min_stay: 1 }),
    freeUnitIds: jest.fn().mockResolvedValue(freeUnits),
  };
  return { prisma, tx, availability };
}

describe('ReservationService.cancel', () => {
  const base = {
    id: 'r_1',
    tenant_id: tenantId,
    room_type_id: 'rt_1',
    unit_id: 'u_1',
    status: 'CONFIRMADA',
    valor_total: 678,
    valor_pago: 339,
  };

  it('>=7 dias de antecedencia: cancela com credito para remarcacao', async () => {
    const reservation = { ...base, checkin: futureDate(10), checkout: futureDate(12) };
    const { prisma, availability } = buildDeps(reservation);
    const service = new ReservationService(prisma as any, availability as any);
    await service.cancel(tenantId, 'r_1', { motivo: 'mudou de planos' } as any, 'admin_1');
    expect(prisma.motorReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADA' } }),
    );
    expect(prisma.motorReservationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'CANCELADA',
          payload: expect.objectContaining({ credito_remarcacao: true }),
        }),
      }),
    );
  });

  it('<7 dias: cancela sem credito (perde antecipacao)', async () => {
    const reservation = { ...base, checkin: futureDate(3), checkout: futureDate(5) };
    const { prisma, availability } = buildDeps(reservation);
    const service = new ReservationService(prisma as any, availability as any);
    await service.cancel(tenantId, 'r_1', { motivo: 'imprevisto' } as any, 'admin_1');
    expect(prisma.motorReservationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({ credito_remarcacao: false }),
        }),
      }),
    );
  });
});

describe('ReservationService.reschedule', () => {
  it('remarca mantendo valor_pago e recalculando saldo (nao e cancelar+criar)', async () => {
    const reservation = {
      id: 'r_1',
      tenant_id: tenantId,
      room_type_id: 'rt_1',
      unit_id: 'u_1',
      status: 'CONFIRMADA',
      checkin: futureDate(10),
      checkout: futureDate(12),
      valor_total: 678,
      valor_pago: 339,
      adultos: 2,
      criancas: 0,
      pets: 0,
    };
    const { prisma, tx, availability } = buildDeps(reservation);
    const service = new ReservationService(prisma as any, availability as any);
    await service.reschedule(
      tenantId,
      'r_1',
      { novo_checkin: '2026-10-10', novo_checkout: '2026-10-12' } as any,
      'admin_1',
    );
    expect(tx.motorReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit_id: 'u_2',
          valor_total: 800,
          saldo_checkin: 461, // 800 - 339 pagos
        }),
      }),
    );
    expect(tx.motorReservationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: 'REMARCADA' }) }),
    );
  });
});

describe('ReservationService.createManual', () => {
  it('cria reserva manual com lock e quote quando valor nao informado', async () => {
    const { prisma, tx, availability } = buildDeps(null);
    prisma.motorReservation.findFirst.mockResolvedValue(null);
    const service = new ReservationService(prisma as any, availability as any);
    const result = await service.createManual(
      tenantId,
      {
        room_type_id: 'rt_1',
        checkin: '2026-10-10',
        checkout: '2026-10-12',
        hospede_nome: 'Maria',
        adultos: 2,
        origem: 'MANUAL',
      } as any,
      'admin_1',
    );
    expect(result.id).toBe('r_new');
    expect(tx.$queryRaw).toHaveBeenCalled(); // FOR UPDATE
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ valor_total: 800 }) }),
    );
  });

  it('detail de reserva alheia falha com 404', async () => {
    const { prisma, availability } = buildDeps(null);
    prisma.motorReservation.findFirst.mockResolvedValue(null);
    const service = new ReservationService(prisma as any, availability as any);
    await expect(service.detail(tenantId, 'r_alheia')).rejects.toBeInstanceOf(MotorNotFoundError);
  });
});
