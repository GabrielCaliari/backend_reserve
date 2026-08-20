import { GuestStatusService } from './guest-status.service';
import { EBotContactAudience } from '../../../../generated/prisma/enums';

const tenantId = 'tenant_1';

function buildPrisma(opts: {
  estadias?: { tenant_id: string; hospede_telefone: string | null }[];
  contatos?: {
    id: string;
    tenant_id: string;
    numero_contato: string;
    tipo_publico: EBotContactAudience | null;
  }[];
}) {
  return {
    motorReservation: {
      findMany: jest.fn().mockResolvedValue(opts.estadias ?? []),
    },
    botContact: {
      findMany: jest.fn().mockResolvedValue(opts.contatos ?? []),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('GuestStatusService.syncAll', () => {
  it('promove LEAD com estadia ativa a HOSPEDE_EM_ESTADIA (match exato de digitos)', async () => {
    const prisma = buildPrisma({
      estadias: [{ tenant_id: tenantId, hospede_telefone: '5535999990000' }],
      contatos: [
        { id: 'c_1', tenant_id: tenantId, numero_contato: '5535999990000', tipo_publico: EBotContactAudience.LEAD },
      ],
    });
    const service = new GuestStatusService(prisma as any);

    const result = await service.syncAll();

    expect(result).toEqual({ promovidos: 1, revertidos: 0 });
    expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c_1'] } },
      data: { tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA },
    });
  });

  it('casa por sufixo quando o DDI diverge (reserva com +55, contato sem)', async () => {
    const prisma = buildPrisma({
      estadias: [{ tenant_id: tenantId, hospede_telefone: '+55 (35) 99999-0000' }],
      contatos: [
        { id: 'c_1', tenant_id: tenantId, numero_contato: '3599990000', tipo_publico: null },
      ],
    });
    const service = new GuestStatusService(prisma as any);

    const result = await service.syncAll();

    expect(result.promovidos).toBe(1);
  });

  it('reverte HOSPEDE_EM_ESTADIA sem estadia ativa para LEAD', async () => {
    const prisma = buildPrisma({
      estadias: [],
      contatos: [
        { id: 'c_1', tenant_id: tenantId, numero_contato: '5535999990000', tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA },
      ],
    });
    const service = new GuestStatusService(prisma as any);

    const result = await service.syncAll();

    expect(result).toEqual({ promovidos: 0, revertidos: 1 });
    expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c_1'] } },
      data: { tipo_publico: EBotContactAudience.LEAD },
    });
  });

  it('nunca toca MENSALISTA, MARINA ou EQUIPE', async () => {
    const prisma = buildPrisma({
      estadias: [{ tenant_id: tenantId, hospede_telefone: '5535999990000' }],
      contatos: [
        { id: 'c_1', tenant_id: tenantId, numero_contato: '5535999990000', tipo_publico: EBotContactAudience.MENSALISTA },
        { id: 'c_2', tenant_id: tenantId, numero_contato: '5535888880000', tipo_publico: EBotContactAudience.MARINA },
        { id: 'c_3', tenant_id: tenantId, numero_contato: '5535777770000', tipo_publico: EBotContactAudience.EQUIPE },
      ],
    });
    const service = new GuestStatusService(prisma as any);

    const result = await service.syncAll();

    expect(result).toEqual({ promovidos: 0, revertidos: 0 });
    expect(prisma.botContact.updateMany).not.toHaveBeenCalled();
  });

  it('contato de outro tenant nao e promovido pela estadia alheia', async () => {
    const prisma = buildPrisma({
      estadias: [{ tenant_id: tenantId, hospede_telefone: '5535999990000' }],
      contatos: [
        { id: 'c_1', tenant_id: 'outro_tenant', numero_contato: '5535999990000', tipo_publico: EBotContactAudience.LEAD },
      ],
    });
    const service = new GuestStatusService(prisma as any);

    const result = await service.syncAll();

    expect(result.promovidos).toBe(0);
  });

  it('busca estadias ativas de hoje com status vendido', async () => {
    const prisma = buildPrisma({});
    const service = new GuestStatusService(prisma as any);

    await service.syncAll();

    expect(prisma.motorReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['CONFIRMADA', 'CHECKIN_FEITO'] },
          hospede_telefone: { not: null },
        }),
      }),
    );
  });
});
