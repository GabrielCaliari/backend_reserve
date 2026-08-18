import { DailyInventoryService } from './daily-inventory.service';
import { utcDate } from '../../domain/constants/motor.constants';

const tenantId = 'tenant_1';

function rule(partial: any) {
  return {
    id: 'pr_1',
    tenant_id: tenantId,
    room_type_id: 'rt_1',
    rate_plan_id: null,
    season_id: null,
    dow_mask: 127,
    preco_noite: 300,
    min_stay: 1,
    ...partial,
  };
}

describe('DailyInventoryService.pickRule', () => {
  const service = new DailyInventoryService({} as any);

  it('regra de temporada vence a base na data coberta, por prioridade', () => {
    const seasons = new Map([
      ['s_alta', { id: 's_alta', data_inicio: utcDate('2026-07-01'), data_fim: utcDate('2026-07-31'), prioridade: 1 }],
      ['s_ferias', { id: 's_ferias', data_inicio: utcDate('2026-07-10'), data_fim: utcDate('2026-07-20'), prioridade: 5 }],
    ]);
    const rules = [
      rule({ id: 'base', preco_noite: 300 }),
      rule({ id: 'alta', season_id: 's_alta', preco_noite: 400 }),
      rule({ id: 'ferias', season_id: 's_ferias', preco_noite: 500 }),
    ];
    expect(service.pickRule(rules as any, seasons as any, utcDate('2026-07-15'))!.id).toBe('ferias');
    expect(service.pickRule(rules as any, seasons as any, utcDate('2026-07-05'))!.id).toBe('alta');
    expect(service.pickRule(rules as any, seasons as any, utcDate('2026-08-05'))!.id).toBe('base');
  });

  it('respeita o dow_mask (fim de semana cheio, meio de semana com desconto)', () => {
    const rules = [
      rule({ id: 'fds', dow_mask: 32 + 64 + 16, preco_noite: 400 }), // sex+sab+dom
      rule({ id: 'semana', dow_mask: 1 + 2 + 4 + 8, preco_noite: 320 }),
    ];
    expect(service.pickRule(rules as any, new Map() as any, utcDate('2026-08-21'))!.id).toBe('fds'); // sexta
    expect(service.pickRule(rules as any, new Map() as any, utcDate('2026-08-18'))!.id).toBe('semana'); // terca
  });

  it('sem regra aplicavel retorna null (data fica sem inventario = nao vendavel)', () => {
    expect(service.pickRule([rule({ dow_mask: 1 })] as any, new Map() as any, utcDate('2026-08-23'))).toBeNull();
  });
});

describe('DailyInventoryService.materializeTenant', () => {
  it('apaga so linhas nao-override e recria com skipDuplicates (preserva overrides)', async () => {
    const prisma = {
      motorPriceRule: { findMany: jest.fn().mockResolvedValue([rule({})]) },
      motorSeason: { findMany: jest.fn().mockResolvedValue([]) },
      motorDailyInventory: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
    };
    const service = new DailyInventoryService(prisma as any);
    const rows = await service.materializeTenant(tenantId, 3);
    expect(rows).toBe(3);
    expect(prisma.motorDailyInventory.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenant_id: tenantId, override: false }),
      }),
    );
    expect(prisma.motorDailyInventory.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });
});
