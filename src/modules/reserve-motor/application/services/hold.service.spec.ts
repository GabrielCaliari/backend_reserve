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

function buildDeps(freeUnits: string[], currentStage: string | null = 'OFERTA_FEITA') {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    motorHold: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'h_1', ...data })),
    },
  };
  const prisma = {
    // create/confirm usam callback; o sync do funil usa ARRAY de ops
    $transaction: jest
      .fn()
      .mockImplementation((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(tx))),
    motorHold: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'h_1', status: 'CANCELADO' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    botLead: {
      findUnique: jest.fn().mockResolvedValue(currentStage ? { current_stage: currentStage } : null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    funnelEvent: { create: jest.fn().mockResolvedValue({ id: 'evt_1' }) },
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

  it('hold criado move o funil do contato para FECHAMENTO_INICIADO (autor bot, motivo HOLD_CRIADO)', async () => {
    const { prisma, availability, events } = buildDeps(['u_1'], 'OFERTA_FEITA');
    const service = new HoldService(prisma as any, availability as any, events as any);
    await service.create(tenantId, dto as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numero_contato: dto.contato_whatsapp,
          de_estagio: 'OFERTA_FEITA',
          para_estagio: 'FECHAMENTO_INICIADO',
          autor_tipo: 'bot',
          motivo: 'HOLD_CRIADO',
        }),
      }),
    );
    expect(prisma.botLead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { current_stage: 'FECHAMENTO_INICIADO' } }),
    );
  });

  it.each(['FECHAMENTO_INICIADO', 'COMPROVANTE_RECEBIDO', 'RESERVA_CONFIRMADA', 'PERDIDO'])(
    'hold criado NAO rebaixa lead ja em %s',
    async (stage) => {
      const { prisma, availability, events } = buildDeps(['u_1'], stage);
      const service = new HoldService(prisma as any, availability as any, events as any);
      await service.create(tenantId, dto as any);
      await new Promise((resolve) => setImmediate(resolve));
      expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
    },
  );

  it('falha no sync do funil nao derruba a criacao do hold', async () => {
    const { prisma, availability, events } = buildDeps(['u_1']);
    prisma.botLead.findUnique.mockRejectedValue(new Error('db fora'));
    const service = new HoldService(prisma as any, availability as any, events as any);
    const result = await service.create(tenantId, dto as any);
    expect(result.hold_id).toBe('h_1');
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

  it('apos confirmar, move o funil do contato para RESERVA_CONFIRMADA e avisa o bot', async () => {
    const { prisma, tx, availability, events } = buildConfirmDeps(baseHold);
    const prismaComBot = {
      ...prisma,
      // syncBotAfterConfirm usa $transaction com ARRAY de ops; o confirm usa callback
      $transaction: jest
        .fn()
        .mockImplementation((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(tx))),
      botLead: {
        findUnique: jest.fn().mockResolvedValue({ current_stage: 'FECHAMENTO_INICIADO' }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      funnelEvent: { create: jest.fn().mockResolvedValue({ id: 'evt_1' }) },
    };
    const service = new HoldService(prismaComBot as any, availability as any, events as any);

    await service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_9' } as any);
    // o sync e fire-and-forget: espera as microtasks assentarem
    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaComBot.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          de_estagio: 'FECHAMENTO_INICIADO',
          para_estagio: 'RESERVA_CONFIRMADA',
          autor_tipo: 'bot',
          numero_contato: baseHold.contato_whatsapp,
        }),
      }),
    );
    expect(prismaComBot.botLead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { current_stage: 'RESERVA_CONFIRMADA' } }),
    );
    expect(events.dispatch).toHaveBeenCalledWith(
      tenantId,
      'reserva.confirmada',
      expect.objectContaining({
        contato_whatsapp: baseHold.contato_whatsapp,
        checkin: '2026-09-05',
        checkout: '2026-09-07',
      }),
    );
  });

  it('lead ja em RESERVA_CONFIRMADA nao gera evento duplicado, mas o bot e avisado', async () => {
    const { prisma, tx, availability, events } = buildConfirmDeps(baseHold);
    const prismaComBot = {
      ...prisma,
      $transaction: jest
        .fn()
        .mockImplementation((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(tx))),
      botLead: {
        findUnique: jest.fn().mockResolvedValue({ current_stage: 'RESERVA_CONFIRMADA' }),
        upsert: jest.fn(),
      },
      funnelEvent: { create: jest.fn() },
    };
    const service = new HoldService(prismaComBot as any, availability as any, events as any);

    await service.confirm(tenantId, 'h_1', { asaas_payment_id: 'pay_10' } as any);
    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaComBot.funnelEvent.create).not.toHaveBeenCalled();
    expect(events.dispatch).toHaveBeenCalledWith(
      tenantId,
      'reserva.confirmada',
      expect.anything(),
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

  it('hold expirado com lead em FECHAMENTO_INICIADO volta para OFERTA_FEITA com motivo HOLD_EXPIRADO', async () => {
    const { prisma, availability, events } = buildDeps([], 'FECHAMENTO_INICIADO');
    prisma.motorHold.findMany.mockResolvedValue([
      { id: 'h_9', tenant_id: tenantId, contato_whatsapp: '5535999990000' },
    ]);
    prisma.motorHold.updateMany.mockResolvedValue({ count: 1 });
    const service = new HoldService(prisma as any, availability as any, events as any);
    await service.expireDue();
    expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          de_estagio: 'FECHAMENTO_INICIADO',
          para_estagio: 'OFERTA_FEITA',
          motivo: 'HOLD_EXPIRADO',
        }),
      }),
    );
  });

  it('hold expirado com lead em outro estagio (ex.: RESERVA_CONFIRMADA por pagamento tardio) nao mexe no funil', async () => {
    const { prisma, availability, events } = buildDeps([], 'RESERVA_CONFIRMADA');
    prisma.motorHold.findMany.mockResolvedValue([
      { id: 'h_9', tenant_id: tenantId, contato_whatsapp: '5535999990000' },
    ]);
    prisma.motorHold.updateMany.mockResolvedValue({ count: 1 });
    const service = new HoldService(prisma as any, availability as any, events as any);
    await service.expireDue();
    expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
  });
});
