import { HoldService } from './hold.service';
import { MotorTipoEsgotadoError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';
const dto = {
  room_type_id: 'rt_1',
  checkin: '2026-09-05',
  checkout: '2026-09-07',
  adultos: 2,
  criancas: 0,
  pets: 0,
  contato_whatsapp: '5535999990000',
  forma_pagamento: 'PIX_LINK',
  cliente_marina: false,
};

function buildDeps(freeUnits: string[]) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    motorHold: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'h_1', ...data })),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    motorHold: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'h_1', status: 'CANCELADO' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const availability = {
    quote: jest.fn().mockResolvedValue({ valor_total: 678, min_stay: 2 }),
    freeUnitIds: jest.fn().mockResolvedValue(freeUnits),
  };
  const events = { dispatch: jest.fn().mockResolvedValue(undefined) };
  return { prisma, tx, availability, events };
}

describe('HoldService.create', () => {
  it('cria hold na primeira unit livre com TTL de PIX_LINK (60min) e 50% antecipado', async () => {
    const { prisma, tx, availability, events } = buildDeps(['u_1', 'u_2']);
    const service = new HoldService(prisma as any, availability as any, events as any);
    const before = Date.now();
    const result = await service.create(tenantId, dto as any);
    expect(result.unit_id).toBe('u_1');
    expect(result.valor_total).toBe(678);
    expect(result.valor_antecipado).toBe(339); // Pix 50%
    const ttlMin = (new Date(result.expires_at).getTime() - before) / 60000;
    expect(ttlMin).toBeGreaterThan(59);
    expect(ttlMin).toBeLessThan(61);
    expect(tx.$queryRaw).toHaveBeenCalled(); // FOR UPDATE nas units
  });

  it('cartao antecipa 100%', async () => {
    const { prisma, availability, events } = buildDeps(['u_1']);
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.create(tenantId, { ...dto, forma_pagamento: 'CARTAO' } as any);
    expect(result.valor_antecipado).toBe(678);
  });

  it('constraint estourou na primeira unit -> tenta a proxima (corrida, spec §1.2)', async () => {
    const { prisma, tx, availability, events } = buildDeps(['u_1', 'u_2']);
    tx.motorHold.create
      .mockRejectedValueOnce(
        Object.assign(new Error('conflicting key value violates exclusion constraint "motor_holds_no_overlap"')),
      )
      .mockImplementationOnce(({ data }: any) => Promise.resolve({ id: 'h_2', ...data }));
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.create(tenantId, dto as any);
    expect(result.unit_id).toBe('u_2');
  });

  it('nenhuma unit livre -> MotorTipoEsgotadoError (bot responde esgotado e refaz availability)', async () => {
    const { prisma, availability, events } = buildDeps([]);
    const service = new HoldService(prisma as any, availability as any, events as any);
    await expect(service.create(tenantId, dto as any)).rejects.toBeInstanceOf(MotorTipoEsgotadoError);
  });
});

describe('HoldService.confirm', () => {
  const baseHold = {
    id: 'h_1',
    tenant_id: tenantId,
    room_type_id: 'rt_1',
    unit_id: 'u_1',
    checkin: new Date(Date.UTC(2026, 8, 5)),
    checkout: new Date(Date.UTC(2026, 8, 7)),
    adultos: 2,
    criancas: 0,
    pets: 0,
    contato_whatsapp: '5535999990000',
    forma_pagamento: 'PIX_LINK',
    valor_total: 678,
    valor_antecipado: 339,
    status: 'ATIVO',
    expires_at: new Date(Date.now() + 60_000),
  };

  function buildConfirmDeps(hold: any, freeUnits: string[] = ['u_1']) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      motorReservation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r_1', ...data })),
      },
      motorReservationEvent: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      motorHold: { update: jest.fn().mockResolvedValue({ ...hold, status: 'CONVERTIDO' }) },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      motorHold: { findFirst: jest.fn().mockResolvedValue(hold) },
      motorReservation: { findFirst: jest.fn().mockResolvedValue(null) },
      motorPaymentException: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pe_1', ...data })),
      },
    };
    const availability = {
      quote: jest.fn(),
      freeUnitIds: jest.fn().mockResolvedValue(freeUnits),
    };
    const events = { dispatch: jest.fn().mockResolvedValue(undefined) };
    return { prisma, tx, availability, events };
  }

  it('converte hold ATIVO em reserva CONFIRMADA com 50/50 do Pix', async () => {
    const { prisma, tx, availability, events } = buildConfirmDeps(baseHold);
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_1' } as any);
    expect(result.status).toBe('CONFIRMADA');
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origem: 'BOT_WHATSAPP',
          forma_pagamento: 'PIX_50',
          valor_pago: 339,
          saldo_checkin: 339,
        }),
      }),
    );
    expect(tx.motorHold.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONVERTIDO' } }),
    );
  });

  it('e idempotente por asaas_payment_id', async () => {
    const { prisma, availability, events } = buildConfirmDeps(baseHold);
    prisma.motorReservation.findFirst.mockResolvedValue({ id: 'r_ja', status: 'CONFIRMADA' });
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_1' } as any);
    expect(result.reservation_id).toBe('r_ja');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('pagamento tardio com vaga: recria nas mesmas datas e confirma', async () => {
    const expired = { ...baseHold, status: 'EXPIRADO' };
    const { prisma, tx, availability, events } = buildConfirmDeps(expired, ['u_2']);
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_2' } as any);
    expect(result.status).toBe('CONFIRMADA');
    expect(tx.motorReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unit_id: 'u_2' }) }),
    );
  });

  it('pagamento tardio SEM vaga: cria payment_exception, avisa o bot e retorna 409', async () => {
    const expired = { ...baseHold, status: 'EXPIRADO' };
    const { prisma, availability, events } = buildConfirmDeps(expired, []);
    const service = new HoldService(prisma as any, availability as any, events as any);
    await expect(
      service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_3' } as any),
    ).rejects.toBeInstanceOf(MotorTipoEsgotadoError);
    expect(prisma.motorPaymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hold_id: 'h_1', valor_pago: 339 }),
      }),
    );
    expect(events.dispatch).toHaveBeenCalledWith(
      tenantId,
      'pagamento.tardio.exception',
      expect.objectContaining({ hold_id: 'h_1' }),
    );
  });
});

describe('HoldService.expireDue', () => {
  it('marca vencidos como EXPIRADO e dispara hold.expirado ao bot', async () => {
    const { prisma, availability, events } = buildDeps([]);
    prisma.motorHold.findMany.mockResolvedValue([
      { id: 'h_9', tenant_id: tenantId, contato_whatsapp: '5535999990000' },
    ]);
    prisma.motorHold.updateMany.mockResolvedValue({ count: 1 });
    const service = new HoldService(prisma as any, availability as any, events as any);
    const count = await service.expireDue();
    expect(count).toBe(1);
    expect(events.dispatch).toHaveBeenCalledWith(
      tenantId,
      'hold.expirado',
      expect.objectContaining({ hold_id: 'h_9' }),
    );
  });
});
