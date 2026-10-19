import { Prisma } from '../../../../generated/prisma/client';
import { BotRetentionPurgeCronProvider } from './bot-retention-purge-cron.provider';

describe('BotRetentionPurgeCronProvider', () => {
  const AGORA = new Date('2026-10-19T12:00:00.000Z');
  const CORTE = new Date(AGORA.getTime() - 365 * 24 * 60 * 60 * 1000);
  let prisma: any;
  let retention: { getRetentionDays: jest.Mock };
  let cron: BotRetentionPurgeCronProvider;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA);
    const n = (count: number) => jest.fn().mockResolvedValue({ count });
    prisma = {
      botIntegrationConfig: { findMany: jest.fn().mockResolvedValue([{ tenant_id: 't1' }]) },
      botMessage: { deleteMany: n(1) },
      botIngestionEvent: { updateMany: n(1) },
      botIssue: { updateMany: n(2) },
      botFeedback: { deleteMany: n(3) },
      motorBotEvent: { deleteMany: n(4) },
    };
    retention = { getRetentionDays: jest.fn().mockResolvedValue(365) };
    cron = new BotRetentionPurgeCronProvider(prisma, retention as any);
  });

  afterEach(() => jest.useRealTimers());

  it('anonimiza issues antigas mantendo a linha (numero, mensagem e conteudo viram null)', async () => {
    await cron.purge();
    const args = prisma.botIssue.updateMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ tenant_id: 't1', ocorrido_em: { lt: CORTE } });
    expect(args.where.OR).toEqual(expect.arrayContaining([{ contexto: { not: Prisma.DbNull } }]));
    expect(args.data).toEqual({
      numero_contato: null,
      mensagem: null,
      mensagem_hospede: null,
      resposta_bot: null,
      contexto: Prisma.DbNull,
    });
  });

  it('apaga feedbacks antigos', async () => {
    await cron.purge();
    expect(prisma.botFeedback.deleteMany).toHaveBeenCalledWith({ where: { tenant_id: 't1', ocorrido_em: { lt: CORTE } } });
  });

  it('apaga eventos do motor SENT/FAILED antigos, sem tocar PENDING', async () => {
    await cron.purge();
    expect(prisma.motorBotEvent.deleteMany).toHaveBeenCalledWith({
      where: { tenant_id: 't1', status: { in: ['SENT', 'FAILED'] }, created_at: { lt: CORTE } },
    });
  });

  it('respeita o retention_days do tenant', async () => {
    retention.getRetentionDays.mockResolvedValue(30);
    await cron.purge();
    const corte30 = new Date(AGORA.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(prisma.botFeedback.deleteMany).toHaveBeenCalledWith({ where: { tenant_id: 't1', ocorrido_em: { lt: corte30 } } });
    expect(prisma.botMessage.deleteMany).toHaveBeenCalledWith({ where: { tenant_id: 't1', ocorrido_em: { lt: corte30 } } });
  });
});
