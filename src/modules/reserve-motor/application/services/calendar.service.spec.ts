import { CalendarService } from './calendar.service';
import { utcDate } from '../../domain/constants/motor.constants';
import { MotorValidationError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';

function buildPrisma() {
  return {
    motorUnit: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'u_1', identificador: 'Casal 01', room_type: { id: 'rt_1', nome: 'Suite Casal' } },
        { id: 'u_2', identificador: 'Chale 02', room_type: { id: 'rt_2', nome: 'Chale' } },
      ]),
    },
    motorReservation: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'r_1', unit_id: 'u_1', hospede_nome: 'Maria', origem: 'OTA_BOOKING',
          status: 'CONFIRMADA', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07'),
        },
      ]),
    },
    motorHold: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'h_1', unit_id: 'u_2', checkin: utcDate('2026-09-10'), checkout: utcDate('2026-09-11'),
          expires_at: new Date(Date.now() + 60_000),
        },
      ]),
    },
    motorBlock: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'b_1', unit_id: 'u_2', motivo: 'MENSALISTA', data_inicio: utcDate('2026-01-01'), data_fim: null },
      ]),
    },
  };
}

describe('CalendarService.month', () => {
  it('monta o grid do mes com estados e precedencia (mensalista > ota > hold)', async () => {
    const service = new CalendarService(buildPrisma() as any);
    const result = await service.month(tenantId, '2026-09');
    expect(result.mes).toBe('2026-09');
    expect(result.unidades).toHaveLength(2);

    const u1 = result.unidades[0];
    expect(u1.dias).toHaveLength(30); // setembro
    expect(u1.dias[4]).toMatchObject({ data: '2026-09-05', estado: 'OTA', reservation_id: 'r_1' });
    expect(u1.dias[6].estado).toBe('LIVRE'); // checkout exclusivo: dia 07 livre

    const u2 = result.unidades[1];
    // Block permanente de mensalista cobre o mes inteiro, inclusive onde ha hold.
    expect(u2.dias.every((d) => d.estado === 'MENSALISTA')).toBe(true);
  });

  it('rejeita mes mal formado', async () => {
    const service = new CalendarService(buildPrisma() as any);
    await expect(service.month(tenantId, 'setembro')).rejects.toThrow();
  });
});

describe('range', () => {
  it('retorna unidades no mesmo shape do month para a janela pedida', async () => {
    const service = new CalendarService(buildPrisma() as any);
    const result = await service.range('tenant_1', '2026-09-05', '2026-09-07');
    expect(result.from).toBe('2026-09-05');
    expect(result.to).toBe('2026-09-07');
    // to inclusivo => 3 dias
    expect(result.unidades[0].dias).toHaveLength(3);
    expect(result.unidades[0].dias[0]).toMatchObject({ data: '2026-09-05' });
  });

  it('rejeita datas invalidas e janela invertida', async () => {
    const service = new CalendarService(buildPrisma() as any);
    await expect(service.range('tenant_1', 'x', '2026-09-07')).rejects.toThrow(MotorValidationError);
    await expect(service.range('tenant_1', '2026-09-08', '2026-09-07')).rejects.toThrow(MotorValidationError);
  });

  it('rejeita janela maior que 62 dias', async () => {
    const service = new CalendarService(buildPrisma() as any);
    await expect(service.range('tenant_1', '2026-01-01', '2026-04-01')).rejects.toThrow(MotorValidationError);
  });
});
