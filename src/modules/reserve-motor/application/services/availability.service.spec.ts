import { AvailabilityService } from './availability.service';
import { utcDate } from '../../domain/constants/motor.constants';

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
