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
