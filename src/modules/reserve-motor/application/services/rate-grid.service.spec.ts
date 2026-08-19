import { RateGridService } from './rate-grid.service';
import { MotorValidationError } from '../../domain/errors/motor.errors';
import { utcDate } from '../../domain/constants/motor.constants';

function buildPrisma() {
  return {
    motorRoomType: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'rt1', nome: 'Suite Casal', capacidade_base: 2, capacidade_max: 3,
          valor_pessoa_adicional: '50.00', ordem: 1,
          units: [{ id: 'u1' }, { id: 'u2' }],
        },
      ]),
    },
    motorDailyInventory: {
      findMany: jest.fn().mockResolvedValue([
        {
          room_type_id: 'rt1', data: utcDate('2026-09-05'), preco: '320.00',
          min_stay: 2, stop_sell: false, closed_arrival: false,
          closed_departure: false, override: true,
        },
      ]),
    },
  };
}

const availability = {
  freeCountByNight: jest.fn().mockResolvedValue(new Map([
    ['2026-09-05', 1], ['2026-09-06', 2],
  ])),
};

describe('RateGridService.grade', () => {
  it('cruza inventario com unidades livres por dia', async () => {
    const service = new RateGridService(buildPrisma() as any, availability as any);
    const result = await service.grade('tenant_1', '2026-09-05', '2026-09-06');
    expect(result.room_types).toHaveLength(1);
    const rt = result.room_types[0];
    expect(rt.total_units).toBe(2);
    expect(rt.dias).toHaveLength(2);
    expect(rt.dias[0]).toMatchObject({
      data: '2026-09-05', min_stay: 2, unidades_livres: 1, override: true,
    });
    // dia sem linha de inventario => preco null, nao vendavel
    expect(rt.dias[1]).toMatchObject({ data: '2026-09-06', preco: null, unidades_livres: 2 });
  });

  it('valida janela como o range do calendario', async () => {
    const service = new RateGridService(buildPrisma() as any, availability as any);
    await expect(service.grade('t', '2026-01-01', '2026-04-01')).rejects.toThrow(MotorValidationError);
  });
});
