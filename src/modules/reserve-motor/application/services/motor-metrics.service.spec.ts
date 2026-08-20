import { MotorMetricsService } from './motor-metrics.service';
import { utcDate } from '../../domain/constants/motor.constants';

function buildPrisma() {
  return {
    motorReservation: {
      findMany: jest.fn().mockResolvedValue([
        { valor_total: '600.00', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07'), origem: 'BOT_WHATSAPP', hospede_telefone: '5535999990000', created_at: new Date('2026-09-02T12:00:00Z') },
        { valor_total: '400.00', checkin: utcDate('2026-09-10'), checkout: utcDate('2026-09-11'), origem: 'OTA_BOOKING', hospede_telefone: null, created_at: new Date('2026-09-03T12:00:00Z') },
      ]),
    },
    motorReservationEvent: {
      findMany: jest.fn().mockResolvedValue([
        { reservation: { valor_total: '250.00' } },
      ]),
    },
    motorHold: {
      findMany: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(
          where.updated_at
            ? [{ valor_total: '320.00' }, { valor_total: '180.00' }] // a_recuperar no periodo
            : [
                // expirados de qualquer epoca, para cruzar com reservas vendidas
                { contato_whatsapp: '5535999990000', created_at: new Date('2026-09-01T12:00:00Z') }, // antes da reserva: recuperada
                { contato_whatsapp: '5535999990000', created_at: new Date('2026-09-04T12:00:00Z') }, // depois: nao conta
                { contato_whatsapp: '5535000000000', created_at: new Date('2026-09-01T12:00:00Z') }, // sem reserva
              ],
        ),
      ),
    },
  };
}

describe('MotorMetricsService.metrics', () => {
  it('agrega receita, room nights, canceladas e a recuperar', async () => {
    const service = new MotorMetricsService(buildPrisma() as any);
    const m = await service.metrics('tenant_1', new Date('2026-09-01'), new Date('2026-09-30'));
    expect(m.receita).toBe(1000);
    expect(m.reservas).toBe(2);
    expect(m.ticket_medio).toBe(500);
    expect(m.room_nights).toBe(3); // 2 noites + 1 noite
    expect(m.canceladas).toEqual({ quantidade: 1, valor: 250 });
    expect(m.a_recuperar).toEqual({ quantidade: 2, valor: 500 });
    expect(m.recuperadas).toEqual({ quantidade: 1, valor: 600 });
    expect(m.receita_bot).toBe(600);
    expect(m.por_origem).toContainEqual({ origem: 'OTA_BOOKING', reservas: 1, receita: 400 });
  });

  it('zero-safe sem dados', async () => {
    const prisma = buildPrisma();
    prisma.motorReservation.findMany.mockResolvedValue([]);
    prisma.motorReservationEvent.findMany.mockResolvedValue([]);
    prisma.motorHold.findMany.mockResolvedValue([]);
    const service = new MotorMetricsService(prisma as any);
    const m = await service.metrics('tenant_1', new Date(), new Date());
    expect(m.ticket_medio).toBe(0);
    expect(m.receita).toBe(0);
    expect(m.recuperadas).toEqual({ quantidade: 0, valor: 0 });
  });
});
