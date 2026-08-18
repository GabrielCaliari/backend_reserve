import { UnitService } from './unit.service';
import { MotorNotFoundError } from '../../domain/errors/motor.errors';

describe('UnitService', () => {
  let prisma: {
    motorRoomType: { findFirst: jest.Mock };
    motorUnit: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let service: UnitService;
  const tenantId = 'tenant_1';

  beforeEach(() => {
    prisma = {
      motorRoomType: { findFirst: jest.fn().mockResolvedValue({ id: 'rt_1' }) },
      motorUnit: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u_1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u_1', ...data })),
      },
    };
    service = new UnitService(prisma as any);
  });

  it('cria unit validando que o room_type pertence ao tenant', async () => {
    await service.create(tenantId, { room_type_id: 'rt_1', identificador: 'Casal 01' } as any);
    expect(prisma.motorRoomType.findFirst).toHaveBeenCalledWith({
      where: { id: 'rt_1', tenant_id: tenantId },
    });
    expect(prisma.motorUnit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('recusa unit apontando para room_type de outro tenant', async () => {
    prisma.motorRoomType.findFirst.mockResolvedValue(null);
    await expect(
      service.create(tenantId, { room_type_id: 'rt_alheio', identificador: 'X' } as any),
    ).rejects.toBeInstanceOf(MotorNotFoundError);
  });
});
