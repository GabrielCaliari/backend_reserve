import { BotRetentionService } from './bot-retention.service';

describe('BotRetentionService.eraseContact', () => {
  let prisma: any;
  let service: BotRetentionService;

  beforeEach(() => {
    const op = () => ({ ok: true });
    prisma = {
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
      botMessage: { deleteMany: jest.fn(op) },
      botContact: { deleteMany: jest.fn(op) },
      botLead: { deleteMany: jest.fn(op) },
      followupAttempt: { deleteMany: jest.fn(op) },
      conversationAttribution: { deleteMany: jest.fn(op) },
      funnelEvent: { updateMany: jest.fn(op) },
      botIngestionEvent: { updateMany: jest.fn(op) },
    };
    service = new BotRetentionService(prisma);
  });

  it('limpa o payload do ledger pelo contact.phone do contrato v2 e pelo campo legado', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.botIngestionEvent.updateMany).toHaveBeenCalledWith({
      where: {
        tenant_id: 't1',
        OR: [
          { payload: { path: ['contact', 'phone'], equals: '5535999' } },
          { payload: { path: ['contato'], equals: '5535999' } },
        ],
      },
      data: { payload: {} },
    });
  });

  it('apaga as tentativas de follow-up do contato', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.followupAttempt.deleteMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
    });
  });

  it('apaga a atribuicao de conversa do contato', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.conversationAttribution.deleteMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
    });
  });
});
