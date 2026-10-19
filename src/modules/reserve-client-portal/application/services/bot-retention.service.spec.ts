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
      botFeedback: { deleteMany: jest.fn(op) },
      motorBotEvent: { deleteMany: jest.fn(op) },
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
      botFeedback: { deleteMany: jest.fn(op), findMany: jest.fn().mockResolvedValue([{ id: 'fb_1' }]) },
      motorBotEvent: { deleteMany: jest.fn(op), findMany: jest.fn().mockResolvedValue([{ id: 'mbe_1' }]) },
    };
    service = new BotRetentionService(prisma);
  });

  it('erase anonimiza as issues do contato e apaga o conteudo, mantendo a contagem por codigo', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.botIssue.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      data: {
        numero_contato: expect.stringMatching(/^[0-9a-f]{20}$/),
        mensagem: null,
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

  it('erase apaga os feedbacks do contato (texto livre do hospede)', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.botFeedback.deleteMany).toHaveBeenCalledWith({ where: { tenant_id: 't1', numero_contato: '5535999' } });
  });

  it('export inclui os feedbacks do contato', async () => {
    const res = await service.exportContact('t1', '5535999');
    expect(prisma.botFeedback.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', numero_contato: '5535999' },
      orderBy: { ocorrido_em: 'asc' },
    });
    expect(res.feedbacks).toEqual([{ id: 'fb_1' }]);
  });

  it('erase apaga os eventos do motor que citam o contato (payload.contato_whatsapp)', async () => {
    await service.eraseContact('t1', '5535999');
    expect(prisma.motorBotEvent.deleteMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', payload: { path: ['contato_whatsapp'], equals: '5535999' } },
    });
  });

  it('export inclui os eventos do motor do contato', async () => {
    const res = await service.exportContact('t1', '5535999');
    expect(prisma.motorBotEvent.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', payload: { path: ['contato_whatsapp'], equals: '5535999' } },
      orderBy: { created_at: 'asc' },
    });
    expect(res.motorEvents).toEqual([{ id: 'mbe_1' }]);
  });
});
