import { BotEventIngestionService } from './bot-event-ingestion.service';

const evento = (id: string, occurredAt: string, type = 'mensagem') =>
  ({ event_id: id, occurred_at: occurredAt, type }) as any;

describe('BotEventIngestionService.ingestBatch', () => {
  let prisma: any;
  let processor: { process: jest.Mock };
  let service: BotEventIngestionService;

  beforeEach(() => {
    prisma = {
      botIngestionEvent: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    processor = { process: jest.fn().mockResolvedValue(undefined) };
    service = new BotEventIngestionService(prisma as any, processor as any);
  });

  it('processa em ordem de occurred_at, mesmo que o lote chegue embaralhado', async () => {
    await service.ingestBatch('tenant_1', [
      evento('b', '2026-10-01T10:05:00.000Z'),
      evento('a', '2026-10-01T10:00:00.000Z'),
    ]);
    expect(processor.process.mock.calls.map((c) => c[1].event_id)).toEqual(['a', 'b']);
  });

  it('guarda o evento inteiro no ledger com o type do contrato', async () => {
    const e = evento('a', '2026-10-01T10:00:00.000Z', 'reserva.confirmada');
    await service.ingestBatch('tenant_1', [e]);
    expect(prisma.botIngestionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: 'tenant_1', event_id: 'a', event_type: 'reserva.confirmada',
        payload: e, status: 'RECEIVED',
      }),
    });
  });

  it('event_id repetido conta como duplicado e nao reprocessa', async () => {
    prisma.botIngestionEvent.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: 'P2002' });
    // Ja PROCESSED: o claim (status != PROCESSED) nao pega a linha.
    prisma.botIngestionEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const result = await service.ingestBatch('tenant_1', [
      evento('a', '2026-10-01T10:00:00.000Z'),
      evento('a', '2026-10-01T10:00:00.000Z'),
    ]);
    expect(result).toEqual({ received: 2, duplicated: 1 });
    expect(processor.process).toHaveBeenCalledTimes(1);
  });

  it('falha de projecao marca FAILED e segue com o resto do lote', async () => {
    processor.process.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    const result = await service.ingestBatch('tenant_1', [
      evento('a', '2026-10-01T10:00:00.000Z'),
      evento('b', '2026-10-01T10:01:00.000Z'),
    ]);
    expect(result).toEqual({ received: 2, duplicated: 0 });
    expect(prisma.botIngestionEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', error_message: 'boom' }) }),
    );
    expect(processor.process).toHaveBeenCalledTimes(2);
  });

  it('erro de banco no ledger sobe (vira 5xx e o bot reenvia o lote)', async () => {
    prisma.botIngestionEvent.create.mockRejectedValue(new Error('db fora'));
    await expect(
      service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]),
    ).rejects.toThrow('db fora');
  });

  it('duplicado que nao foi PROCESSED e projetado de novo', async () => {
    prisma.botIngestionEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    const result = await service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    expect(result).toEqual({ received: 1, duplicated: 1 });
    expect(processor.process).toHaveBeenCalledTimes(1);
    expect(prisma.botIngestionEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSED' }) }),
    );
  });

  it('duplicado ja esgotado (5 tentativas) nao e projetado', async () => {
    prisma.botIngestionEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    // attempts = 5: o claim (attempts < 5) nao pega a linha.
    prisma.botIngestionEvent.updateMany.mockResolvedValue({ count: 0 });
    await service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('outra execucao ja reivindicou o evento: nao projeta duas vezes', async () => {
    prisma.botIngestionEvent.updateMany.mockResolvedValue({ count: 0 });
    await service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('claim e um lease: grava claimed_at e so pega lease livre ou expirado', async () => {
    await service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    const { where, data } = prisma.botIngestionEvent.updateMany.mock.calls[0][0];
    expect(where).toEqual(expect.objectContaining({
      tenant_id: 'tenant_1', event_id: 'a', status: { not: 'PROCESSED' }, attempts: { lt: 5 },
    }));
    expect(where.OR[0]).toEqual({ claimed_at: null });
    expect(data.claimed_at).toBeInstanceOf(Date);
    expect(where.OR[1].claimed_at.lt.getTime()).toBe(data.claimed_at.getTime() - 5 * 60_000);
    expect(data.attempts).toEqual({ increment: 1 });
    expect(prisma.botIngestionEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PROCESSED', claimed_at: null }),
    }));
  });

  it('segundo claim com o lease do primeiro ativo (antes do PROCESSED) nao projeta de novo', async () => {
    // O primeiro claim vence; enquanto ele projeta, a linha tem claimed_at recente
    // e o status ainda e RECEIVED. O cron roda nesse intervalo e o seu claim nao pega.
    let releaseFirst: () => void = () => undefined;
    processor.process.mockImplementationOnce(() => new Promise<void>((r) => { releaseFirst = r; }));
    prisma.botIngestionEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.botIngestionEvent.findMany.mockResolvedValue([
      { tenant_id: 'tenant_1', event_id: 'a', payload: evento('a', '2026-10-01T10:00:00.000Z') },
    ]);

    const first = service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    await new Promise((r) => setImmediate(r));
    const second = await service.reprocessStuck(new Date('2026-10-01T11:00:00.000Z'));
    releaseFirst();
    await first;

    expect(second).toEqual({ reprocessed: 0 });
    expect(processor.process).toHaveBeenCalledTimes(1);
    const secondWhere = prisma.botIngestionEvent.updateMany.mock.calls[1][0].where;
    expect(secondWhere.OR).toEqual([
      { claimed_at: null },
      { claimed_at: { lt: expect.any(Date) } },
    ]);
  });

  it('falha de projecao libera o lease (claimed_at: null)', async () => {
    processor.process.mockRejectedValueOnce(new Error('boom'));
    await service.ingestBatch('tenant_1', [evento('a', '2026-10-01T10:00:00.000Z')]);
    expect(prisma.botIngestionEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', claimed_at: null }),
    }));
  });

  it('reprocessStuck projeta FAILED/RECEIVED antigos em ordem de occurred_at', async () => {
    const now = new Date('2026-10-06T12:00:00.000Z');
    prisma.botIngestionEvent.findMany.mockResolvedValue([
      { tenant_id: 't1', event_id: 'x', attempts: 1, status: 'FAILED', payload: evento('x', '2026-10-06T11:00:00.000Z') },
      { tenant_id: 't1', event_id: 'y', attempts: 0, status: 'RECEIVED', payload: evento('y', '2026-10-06T11:01:00.000Z') },
    ]);
    const r = await service.reprocessStuck(now);
    expect(prisma.botIngestionEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: { in: ['FAILED', 'RECEIVED'] },
        attempts: { lt: 5 },
        received_at: { lt: new Date('2026-10-06T11:55:00.000Z') },
        OR: [{ claimed_at: null }, { claimed_at: { lt: new Date('2026-10-06T11:55:00.000Z') } }],
      },
      orderBy: { occurred_at: 'asc' },
      take: 500,
    }));
    expect(processor.process.mock.calls.map((c) => c[1].event_id)).toEqual(['x', 'y']);
    expect(r).toEqual({ reprocessed: 2 });
  });

  it('reprocessStuck aceita lote menor (gatilho HTTP)', async () => {
    await service.reprocessStuck(new Date(), 100);
    expect(prisma.botIngestionEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('reprocessStuck: uma linha que explode nao para as outras', async () => {
    prisma.botIngestionEvent.findMany.mockResolvedValue([
      { tenant_id: 't1', event_id: 'x', payload: evento('x', '2026-10-06T11:00:00.000Z') },
      { tenant_id: 't1', event_id: 'y', payload: evento('y', '2026-10-06T11:01:00.000Z') },
    ]);
    prisma.botIngestionEvent.updateMany
      .mockRejectedValueOnce(new Error('db piscou'))
      .mockResolvedValueOnce({ count: 1 });
    const r = await service.reprocessStuck(new Date('2026-10-06T12:00:00.000Z'));
    expect(r).toEqual({ reprocessed: 1 });
    expect(processor.process.mock.calls.map((c) => c[1].event_id)).toEqual(['y']);
  });

  it('countStuck conta presos do tenant ha mais de 5 minutos', async () => {
    prisma.botIngestionEvent.count.mockResolvedValue(3);
    const n = await service.countStuck('tenant_1');
    expect(n).toBe(3);
    expect(prisma.botIngestionEvent.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenant_id: 'tenant_1', status: { in: ['FAILED', 'RECEIVED'] } }),
    });
  });
});
