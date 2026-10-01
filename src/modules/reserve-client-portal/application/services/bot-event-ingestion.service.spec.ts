import { BotEventIngestionService } from './bot-event-ingestion.service';

const evento = (id: string, occurredAt: string, type = 'mensagem') =>
  ({ event_id: id, occurred_at: occurredAt, type }) as any;

describe('BotEventIngestionService.ingestBatch', () => {
  let prisma: { botIngestionEvent: { create: jest.Mock; update: jest.Mock } };
  let processor: { process: jest.Mock };
  let service: BotEventIngestionService;

  beforeEach(() => {
    prisma = {
      botIngestionEvent: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
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
});
