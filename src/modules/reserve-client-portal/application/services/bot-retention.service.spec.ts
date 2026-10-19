import { Prisma } from '../../../../generated/prisma/client';
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
      botIssue: { updateMany: jest.fn(op) },
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

describe('BotRetentionService: erros do bot (bot_issues)', () => {
  let prisma: any;
  let service: BotRetentionService;

  beforeEach(() => {
    const op = () => ({ ok: true });
    prisma = {
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
      botMessage: { deleteMany: jest.fn(op), findMany: jest.fn().mockResolvedValue([]) },
      botContact: { deleteMany: jest.fn(op), findUnique: jest.fn().mockResolvedValue(null) },
      botLead: { deleteMany: jest.fn(op) },
      followupAttempt: { updateMany: jest.fn(op) },
      conversationAttribution: { updateMany: jest.fn(op) },
      funnelEvent: { updateMany: jest.fn(op), findMany: jest.fn().mockResolvedValue([]) },
      botIngestionEvent: { updateMany: jest.fn(op) },
      botIssue: { updateMany: jest.fn(op), findMany: jest.fn().mockResolvedValue([{ id: 'iss_1' }]) },
    };
    service = new BotRetentionService(prisma);
  });

  it('erase anonimiza as issues do contato e apaga o conteudo, mantendo a contagem por codigo', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.botIssue.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      data: {
        numero_contato: expect.stringMatching(/^[0-9a-f]{20}$/),
        mensagem_hospede: null,
        resposta_bot: null,
        contexto: Prisma.DbNull,
      },
    });
  });

  it('export inclui as issues do contato', async () => {
    const res = await service.exportContact('t1', '5535999');
    expect(prisma.botIssue.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      orderBy: { ocorrido_em: 'asc' },
    });
    expect(res.issues).toEqual([{ id: 'iss_1' }]);
  });
});
