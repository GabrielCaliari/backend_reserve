import { BlockService } from './block.service';
import { MotorValidationError } from '../../domain/errors/motor.errors';

const tenantId = 'tenant_1';

function buildPrisma(overlappingReservations = 0) {
  return {
    motorUnit: { findFirst: jest.fn().mockResolvedValue({ id: 'u_1' }) },
    motorReservation: { count: jest.fn().mockResolvedValue(overlappingReservations) },
    motorBlock: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ id: 'b_1', tenant_id: tenantId }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'b_1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'b_1' }),
    },
  };
}

describe('BlockService', () => {
  it('cria block permanente de mensalista (data_fim null)', async () => {
    const prisma = buildPrisma();
    const service = new BlockService(prisma as any);
    const block = await service.create(
      tenantId,
      { unit_id: 'u_1', data_inicio: '2026-09-01', motivo: 'MENSALISTA' } as any,
      'admin_1',
    );
    expect(block.data_fim).toBeNull();
    expect(prisma.motorBlock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenant_id: tenantId, motivo: 'MENSALISTA', data_fim: null }),
      }),
    );
  });

  it('rejeita block sobre reserva ativa (bloqueio nao expulsa hospede)', async () => {
    const prisma = buildPrisma(1);
    const service = new BlockService(prisma as any);
    await expect(
      service.create(
        tenantId,
        { unit_id: 'u_1', data_inicio: '2026-09-01', data_fim: '2026-09-10', motivo: 'MANUTENCAO' } as any,
        'admin_1',
      ),
    ).rejects.toBeInstanceOf(MotorValidationError);
  });
});
