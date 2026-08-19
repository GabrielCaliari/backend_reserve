import { AvailabilityService } from './availability.service';
import { utcDate } from '../../domain/constants/motor.constants';
import {
  MotorTipoEsgotadoError,
  MotorValidationError,
} from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';

function buildPrisma(overrides: Partial<Record<string, any>> = {}) {
  return {
    motorRoomType: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'rt_1',
          nome: 'Suite Casal',
          descricao_curta: null,
          capacidade_base: 2,
          capacidade_max: 3,
          valor_pessoa_adicional: 80,
          aceita_pets: true,
          taxa_pet_dia: 50,
          units: [
            { id: 'u_1', identificador: 'Casal 01' },
            { id: 'u_2', identificador: 'Casal 02' },
          ],
        },
      ]),
      findFirst: jest.fn(),
    },
    motorDailyInventory: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        { room_type_id: 'rt_1', data: utcDate('2026-09-05'), preco: 339, min_stay: 2, closed_arrival: false, closed_departure: false, stop_sell: false },
        { room_type_id: 'rt_1', data: utcDate('2026-09-06'), preco: 339, min_stay: 1, closed_arrival: false, closed_departure: false, stop_sell: false },
      ]),
    },
    motorReservation: { findMany: jest.fn().mockResolvedValue([]) },
    motorHold: { findMany: jest.fn().mockResolvedValue([]) },
    motorBlock: { findMany: jest.fn().mockResolvedValue([]) },
    motorRatePlan: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
}

const query = { checkin: '2026-09-05', checkout: '2026-09-07', adultos: 2, criancas: 0, pets: 0 };

describe('AvailabilityService.search', () => {
  it('retorna tipo com vaga, total calculado e unidades_livres', async () => {
    const prisma = buildPrisma();
    const service = new AvailabilityService(prisma as any);
    const result = await service.search(tenantId, query as any);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      room_type_id: 'rt_1',
      unidades_livres: 2,
      min_stay: 2,
      valor_total: 678, // 339 * 2 noites, sem adicionais
    });
  });

  it('ERRO CLASSICO (spec §1.1): 1 vaga na segunda e 1 na terca em units DIFERENTES nao e disponibilidade', async () => {
    const prisma = buildPrisma({
      motorReservation: {
        findMany: jest.fn().mockResolvedValue([
          // u_1 ocupada na noite de 05; u_2 ocupada na noite de 06
          { unit_id: 'u_1', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-06') },
          { unit_id: 'u_2', checkin: utcDate('2026-09-06'), checkout: utcDate('2026-09-07') },
        ]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    const result = await service.search(tenantId, query as any);
    // Nenhuma unit esta livre nas DUAS noites -> tipo fora da resposta.
    expect(result).toHaveLength(0);
  });

  it('cobra pessoa adicional e taxa de pet por noite', async () => {
    const prisma = buildPrisma();
    const service = new AvailabilityService(prisma as any);
    const result = await service.search(tenantId, {
      ...query,
      adultos: 3,
      pets: 1,
    } as any);
    // 678 base + 80*2 noites adicional + 50*2 noites pet
    expect(result[0].valor_total).toBe(678 + 160 + 100);
  });

  it('exclui tipo quando pessoas excedem capacidade_max ou pets sem aceita_pets', async () => {
    const prisma = buildPrisma();
    const service = new AvailabilityService(prisma as any);
    expect(await service.search(tenantId, { ...query, adultos: 4 } as any)).toHaveLength(0);
  });

  it('exclui tipo com stop_sell em qualquer noite ou noites < min_stay do checkin', async () => {
    const prisma = buildPrisma();
    prisma.motorDailyInventory.findMany.mockResolvedValue([
      { room_type_id: 'rt_1', data: utcDate('2026-09-05'), preco: 339, min_stay: 3, closed_arrival: false, closed_departure: false, stop_sell: false },
      { room_type_id: 'rt_1', data: utcDate('2026-09-06'), preco: 339, min_stay: 1, closed_arrival: false, closed_departure: false, stop_sell: false },
    ]);
    const service = new AvailabilityService(prisma as any);
    // 2 noites < min_stay 3 do dia de chegada
    expect(await service.search(tenantId, query as any)).toHaveLength(0);
  });

  it('hold ATIVO nao vencido ocupa a unit; hold vencido nao ocupa', async () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    const prisma = buildPrisma({
      motorHold: {
        findMany: jest.fn().mockResolvedValue([
          { unit_id: 'u_1', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07'), expires_at: future },
          { unit_id: 'u_2', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07'), expires_at: past },
        ]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    const result = await service.search(tenantId, query as any);
    expect(result[0].unidades_livres).toBe(1); // so u_2 (hold vencido)
  });

  it('cliente_marina aplica o percentual_ajuste do rate_plan Marina', async () => {
    const prisma = buildPrisma({
      motorRatePlan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rp_m', percentual_ajuste: -10 }),
      },
    });
    const service = new AvailabilityService(prisma as any);
    const quote = await service.quote(tenantId, {
      room_type_id: 'rt_1',
      checkin: utcDate('2026-09-05'),
      checkout: utcDate('2026-09-07'),
      adultos: 2,
      criancas: 0,
      pets: 0,
      cliente_marina: true,
    });
    expect(quote.valor_total).toBeCloseTo(678 * 0.9, 2);
  });
});

describe('AvailabilityService.freeCountByNight (numAvail do push de canais)', () => {
  function buildNightPrisma(overrides: Partial<Record<string, any>> = {}) {
    return {
      motorUnit: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u_1' }, { id: 'u_2' }]),
      },
      motorReservation: { findMany: jest.fn().mockResolvedValue([]) },
      motorHold: { findMany: jest.fn().mockResolvedValue([]) },
      motorBlock: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    };
  }

  it('conta livres por noite com a mesma regra do busyUnitIds (reserva, hold ativo, block)', async () => {
    const prisma = buildNightPrisma({
      motorReservation: {
        findMany: jest.fn().mockResolvedValue([
          // u_1 ocupada so na noite de 05
          { unit_id: 'u_1', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-06') },
        ]),
      },
      motorHold: {
        findMany: jest.fn().mockResolvedValue([
          // hold ATIVO ocupa u_2 na noite de 06 (numAvail considera holds, spec §3)
          { unit_id: 'u_2', checkin: utcDate('2026-09-06'), checkout: utcDate('2026-09-07') },
        ]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    const result = await service.freeCountByNight(
      tenantId,
      'rt_1',
      utcDate('2026-09-05'),
      utcDate('2026-09-08'),
    );
    expect(result.get('2026-09-05')).toBe(1); // u_1 reservada
    expect(result.get('2026-09-06')).toBe(1); // u_2 em hold
    expect(result.get('2026-09-07')).toBe(2); // todas livres
  });

  it('block permanente (data_fim null) ocupa a unit em todas as noites', async () => {
    const prisma = buildNightPrisma({
      motorBlock: {
        findMany: jest.fn().mockResolvedValue([
          { unit_id: 'u_2', data_inicio: utcDate('2026-09-01'), data_fim: null },
        ]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    const result = await service.freeCountByNight(
      tenantId,
      'rt_1',
      utcDate('2026-09-05'),
      utcDate('2026-09-07'),
    );
    expect(result.get('2026-09-05')).toBe(1);
    expect(result.get('2026-09-06')).toBe(1);
  });
});

describe('AvailabilityService.quote — motivo do periodo invendavel', () => {
  const params = {
    room_type_id: 'rt_1',
    checkin: utcDate('2026-09-05'),
    checkout: utcDate('2026-09-07'),
    adultos: 2,
    criancas: 0,
    pets: 0,
    cliente_marina: false,
  };

  it('periodo sem tarifa no calendario e erro de configuracao (400), nao esgotado', async () => {
    const prisma = buildPrisma({
      motorDailyInventory: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    await expect(service.quote(tenantId, params)).rejects.toThrow(
      MotorValidationError,
    );
    await expect(service.quote(tenantId, params)).rejects.toThrow(/sem tarifa/);
  });

  it('periodo tarifado com todas as units ocupadas segue como tipo esgotado (409)', async () => {
    const prisma = buildPrisma({
      motorReservation: {
        findMany: jest.fn().mockResolvedValue([
          { unit_id: 'u_1', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07') },
          { unit_id: 'u_2', checkin: utcDate('2026-09-05'), checkout: utcDate('2026-09-07') },
        ]),
      },
    });
    const service = new AvailabilityService(prisma as any);
    await expect(service.quote(tenantId, params)).rejects.toThrow(
      MotorTipoEsgotadoError,
    );
  });
});
