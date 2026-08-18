import { RoomTypeService } from './room-type.service';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';

describe('RoomTypeService', () => {
  let prisma: {
    motorRoomType: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: RoomTypeService;
  const tenantId = 'tenant_1';

  beforeEach(() => {
    prisma = {
      motorRoomType: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rt_1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rt_1', ...data })),
      },
    };
    service = new RoomTypeService(prisma as any);
  });

  it('cria room_type valido escopado ao tenant', async () => {
    const created = await service.create(tenantId, {
      nome: 'Suite Casal',
      capacidade_base: 2,
      capacidade_max: 3,
      valor_pessoa_adicional: 80,
      aceita_pets: true,
      taxa_pet_dia: 50,
    } as any);
    expect(prisma.motorRoomType.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId }) }),
    );
    expect(created.id).toBe('rt_1');
  });

  it('rejeita capacidade_max maior que base+1 (regra: max 1 adicional, spec §2)', async () => {
    await expect(
      service.create(tenantId, { nome: 'X', capacidade_base: 2, capacidade_max: 4 } as any),
    ).rejects.toBeInstanceOf(MotorValidationError);
    expect(prisma.motorRoomType.create).not.toHaveBeenCalled();
  });

  it('update falha com 404 se o room_type nao for do tenant', async () => {
    prisma.motorRoomType.findFirst.mockResolvedValue(null);
    await expect(service.update(tenantId, 'rt_alheio', { nome: 'Y' } as any)).rejects.toBeInstanceOf(
      MotorNotFoundError,
    );
    expect(prisma.motorRoomType.findFirst).toHaveBeenCalledWith({
      where: { id: 'rt_alheio', tenant_id: tenantId },
    });
  });
});
