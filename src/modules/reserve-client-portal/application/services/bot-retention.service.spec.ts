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
      followupAttempt: { updateMany: jest.fn(op) },
      conversationAttribution: { updateMany: jest.fn(op) },
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

  it('anonimiza as tentativas de follow-up do contato', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.followupAttempt.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      data: { numero_contato: expect.stringMatching(/^[0-9a-f]{20}$/) },
    });
  });

  it('anonimiza a atribuicao de conversa do contato', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.conversationAttribution.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      data: { numero_contato: expect.stringMatching(/^[0-9a-f]{20}$/) },
    });
  });
});
