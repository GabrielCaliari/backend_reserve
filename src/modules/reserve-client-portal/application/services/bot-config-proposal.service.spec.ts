import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BotConfigProposalService } from './bot-config-proposal.service';
import { CreateBotConfigProposalDto } from '../dtos/bot-config-proposal.dto';

describe('BotConfigProposalService (contrato v2 §6)', () => {
  let prisma: any;
  let actions: { dispatch: jest.Mock };
  let service: BotConfigProposalService;

  beforeEach(() => {
    prisma = {
      botConfigProposal: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p_1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'p_1', tenant_id: 'tenant_1', status: 'PENDENTE' }),
        update: jest.fn().mockResolvedValue({ id: 'p_1', campo: 'tarifa:361057:A', valor_proposto: 33900, status: 'APROVADA' }),
      },
    };
    actions = { dispatch: jest.fn().mockResolvedValue({ ok: true, state: null }) };
    service = new BotConfigProposalService(prisma, { record: jest.fn() } as any, actions as any);
  });

  it('aprovar despacha apply_config com chave e valor', async () => {
    await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(actions.dispatch).toHaveBeenCalledWith('tenant_1', 'apply_config', {
      actorId: 'revisor_1', payload: { key: 'tarifa:361057:A', value: 33900 },
    });
  });

  it('aprovar devolve ok/state do apply_config e ok:false quando o bot nao responde', async () => {
    const okResult = await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(okResult.data).toMatchObject({ id: 'p_1', status: 'APROVADA', ok: true });
    actions.dispatch.mockResolvedValue({ ok: false, state: null });
    const failed = await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(failed.status).toBe(200);
    expect(failed.data).toMatchObject({ status: 'APROVADA', ok: false, state: null });
  });

  it('proposta que nao esta pendente nao e reaplicada', async () => {
    prisma.botConfigProposal.findFirst.mockResolvedValue({ id: 'p_1', status: 'APROVADA' });
    const result = await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(result.status).toBe(409);
    expect(actions.dispatch).not.toHaveBeenCalled();
  });

  it('grava string numerica como numero', async () => {
    await service.submit('tenant_1', 'autor_1', { campo: 'tarifa:361057:A', categoria: 'pricing', valor_proposto: '33900' } as any);
    expect(prisma.botConfigProposal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ valor_proposto: 33900 }),
    });
  });

  it('aprovar tarifa:* devolve pendente_no_bot: true e envia numero', async () => {
    const r = await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(r.data).toEqual(expect.objectContaining({ pendente_no_bot: true }));
    expect(actions.dispatch).toHaveBeenCalledWith('tenant_1', 'apply_config', expect.objectContaining({
      payload: { key: 'tarifa:361057:A', value: 33900 },
    }));
  });

  it('aprovar hold_min_cartao devolve pendente_no_bot: false', async () => {
    prisma.botConfigProposal.update.mockResolvedValue({ id: 'p_1', campo: 'hold_min_cartao', valor_proposto: 30 });
    const r = await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(r.data).toEqual(expect.objectContaining({ pendente_no_bot: false }));
  });

  it('proposta antiga com valor nao-string passa inalterada no approve', async () => {
    prisma.botConfigProposal.update.mockResolvedValue({ id: 'p_1', campo: 'x', valor_proposto: { a: 1 } });
    await service.approve('tenant_1', 'p_1', 'revisor_1');
    expect(actions.dispatch).toHaveBeenCalledWith('tenant_1', 'apply_config', expect.objectContaining({
      payload: { key: 'x', value: { a: 1 } },
    }));
  });

  it('guarda a justificativa do cliente separada do retorno da agencia', async () => {
    await service.submit('tenant_1', 'autor_1', {
      campo: 'hold_min_pix_manual', categoria: 'policies', valor_proposto: 90, justificativa: 'hospedes pedem mais prazo',
    } as any);
    expect(prisma.botConfigProposal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ justificativa_cliente: 'hospedes pedem mais prazo' }),
    });
  });
});

describe('CreateBotConfigProposalDto', () => {
  const build = (payload: Record<string, unknown>) =>
    validate(plainToInstance(CreateBotConfigProposalDto, payload), { whitelist: true });

  it('valor_proposto sobrevive ao whitelist e e obrigatorio', async () => {
    const dto = plainToInstance(CreateBotConfigProposalDto, { campo: 'x', categoria: 'pricing', valor_proposto: 33900 });
    expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    expect(dto.valor_proposto).toBe(33900);

    const faltando = await build({ campo: 'x', categoria: 'pricing' });
    expect(faltando.some((e) => e.property === 'valor_proposto')).toBe(true);
  });
});
