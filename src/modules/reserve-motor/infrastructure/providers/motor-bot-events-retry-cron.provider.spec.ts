import { MotorBotEventsRetryCronProvider } from './motor-bot-events-retry-cron.provider';

describe('MotorBotEventsRetryCronProvider', () => {
  it('reenvia FAILED com menos de 5 tentativas, mais antigos primeiro, e segue apos erro', async () => {
    const prisma: any = {
      motorBotEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]) },
    };
    const events: any = { retry: jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(true) };
    const cron = new MotorBotEventsRetryCronProvider(prisma, events);
    await cron.run();
    expect(prisma.motorBotEvent.findMany).toHaveBeenCalledWith({
      where: { status: 'FAILED', attempts: { lt: 5 } },
      orderBy: { created_at: 'asc' },
      take: 200,
      select: { id: true },
    });
    expect(events.retry).toHaveBeenCalledTimes(2);
    expect(events.retry).toHaveBeenCalledWith('b');
  });
});
