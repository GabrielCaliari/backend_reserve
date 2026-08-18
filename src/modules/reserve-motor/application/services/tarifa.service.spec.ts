import { TarifaService } from './tarifa.service';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';

function buildPrisma() {
  const model = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue({ id: 'x', tenant_id: tenantId }),
    create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'novo', ...data })),
    update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'x', ...data })),
    delete: jest.fn().mockResolvedValue({ id: 'x' }),
  });
  return {
    motorSeason: model(),
    motorPriceRule: model(),
    motorCancellationPolicy: model(),
    motorRatePlan: model(),
    motorRoomType: { findFirst: jest.fn().mockResolvedValue({ id: 'rt_1' }) },
  };
}

describe('TarifaService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let materializer: { materializeTenant: jest.Mock };
  let service: TarifaService;

  beforeEach(() => {
    prisma = buildPrisma();
    materializer = { materializeTenant: jest.fn().mockResolvedValue(10) };
    service = new TarifaService(prisma as any, materializer as any);
  });

  it('cria season e re-materializa o calendario do tenant', async () => {
    await service.createSeason(tenantId, {
      nome: 'Alta',
      data_inicio: '2026-07-01',
      data_fim: '2026-07-31',
      prioridade: 1,
    } as any);
    expect(prisma.motorSeason.create).toHaveBeenCalled();
    expect(materializer.materializeTenant).toHaveBeenCalledWith(tenantId);
  });

  it('rejeita season com data_fim antes de data_inicio', async () => {
    await expect(
      service.createSeason(tenantId, {
        nome: 'X',
        data_inicio: '2026-07-31',
        data_fim: '2026-07-01',
      } as any),
    ).rejects.toBeInstanceOf(MotorValidationError);
    expect(materializer.materializeTenant).not.toHaveBeenCalled();
  });

  it('cria price_rule validando room_type do tenant e re-materializa', async () => {
    await service.createPriceRule(tenantId, {
      room_type_id: 'rt_1',
      dow_mask: 96,
      preco_noite: 400,
      min_stay: 2,
    } as any);
    expect(prisma.motorRoomType.findFirst).toHaveBeenCalledWith({
      where: { id: 'rt_1', tenant_id: tenantId },
    });
    expect(materializer.materializeTenant).toHaveBeenCalledWith(tenantId);
  });

  it('delete de price_rule de outro tenant falha com 404', async () => {
    prisma.motorPriceRule.findFirst.mockResolvedValue(null);
    await expect(service.deletePriceRule(tenantId, 'pr_alheia')).rejects.toBeInstanceOf(
      MotorNotFoundError,
    );
    expect(prisma.motorPriceRule.delete).not.toHaveBeenCalled();
  });
});
