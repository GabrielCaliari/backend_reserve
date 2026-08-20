import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';
import { FunnelService, RETOMADA_HUMANA_MOTIVO } from './funnel.service';
import { FunnelStageChangeDto } from '../dtos/funnel-stage-change.dto';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';

describe('FunnelService.moveStage', () => {
  let prisma: {
    botLead: { findUnique: jest.Mock; upsert: jest.Mock };
    botContact: { updateMany: jest.Mock };
    funnelEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let webhook: { dispatch: jest.Mock };
  let service: FunnelService;

  const tenantId = 'tenant_123';
  const numeroContato = '5511999999999';
  const adminId = 'admin_1';

  beforeEach(() => {
    prisma = {
      botLead: { findUnique: jest.fn(), upsert: jest.fn() },
      botContact: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      funnelEvent: { create: jest.fn() },
      // O service le o retorno como [funnelEvent]; devolve um evento fake.
      $transaction: jest.fn().mockResolvedValue([{ id: 'evt_1' }]),
    };
    webhook = { dispatch: jest.fn().mockResolvedValue(undefined) };
    service = new FunnelService(prisma as any, webhook as any);
  });

  const currentStageIs = (stage: EFunnelStage | null) =>
    prisma.botLead.findUnique.mockResolvedValue(stage ? { current_stage: stage } : null);

  describe('motivo obrigatorio no PERDIDO', () => {
    it('recusa mover para PERDIDO sem motivo', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);

      await expect(
        service.moveStage(tenantId, numeroContato, EFunnelStage.PERDIDO, adminId),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(webhook.dispatch).not.toHaveBeenCalled();
    });

    it('recusa motivo so com espacos em branco', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);

      await expect(
        service.moveStage(tenantId, numeroContato, EFunnelStage.PERDIDO, adminId, '   '),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aceita PERDIDO com motivo e grava o motivo ja trimado', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);

      await service.moveStage(
        tenantId,
        numeroContato,
        EFunnelStage.PERDIDO,
        adminId,
        '  achou caro  ',
      );

      expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            de_estagio: EFunnelStage.OFERTA_FEITA,
            para_estagio: EFunnelStage.PERDIDO,
            motivo: 'achou caro',
            autor_tipo: 'humano',
            autor_id: adminId,
          }),
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('nao exige motivo nos demais estagios', async () => {
      currentStageIs(EFunnelStage.QUALIFICADO);

      await service.moveStage(
        tenantId,
        numeroContato,
        EFunnelStage.ACOMODACAO_APRESENTADA,
        adminId,
      );

      expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ motivo: null }) }),
      );
    });

    it('normaliza motivo so de espacos para null fora do PERDIDO', async () => {
      // Sem o `|| undefined`, o `?? null` deixaria passar string vazia e a
      // coluna passaria a ter duas representacoes de "sem motivo" ('' e NULL),
      // quebrando qualquer filtro por `motivo: null`. O caminho do bot
      // (BotEventProcessorService.moveStage) ja normalizava assim.
      currentStageIs(EFunnelStage.QUALIFICADO);

      await service.moveStage(
        tenantId,
        numeroContato,
        EFunnelStage.ACOMODACAO_APRESENTADA,
        adminId,
        '   ',
      );

      expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ motivo: null }) }),
      );
    });

    it('valida o motivo antes do no-op de mesmo estagio', async () => {
      // Um lead ja PERDIDO que recebe PERDIDO sem motivo deve reclamar do
      // motivo, nao do "ja esta nesse estagio" -- a mensagem precisa apontar
      // para o que o humano tem que corrigir.
      currentStageIs(EFunnelStage.PERDIDO);

      await expect(
        service.moveStage(tenantId, numeroContato, EFunnelStage.PERDIDO, adminId),
      ).rejects.toThrow(/motivo/i);
    });
  });

  describe('estagio de entrada', () => {
    it('usa CONTATO_INICIADO como de_estagio quando o lead ainda nao existe', async () => {
      currentStageIs(null);

      await service.moveStage(tenantId, numeroContato, EFunnelStage.QUALIFICADO, adminId);

      expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ de_estagio: EFunnelStage.CONTATO_INICIADO }),
        }),
      );
    });
  });

  describe('subtipo de publico', () => {
    it('grava o subtipo no contato, nao no evento de estagio', async () => {
      currentStageIs(EFunnelStage.CONTATO_INICIADO);

      await service.moveStage(
        tenantId,
        numeroContato,
        EFunnelStage.PUBLICO_IDENTIFICADO,
        adminId,
        undefined,
        EBotContactAudience.MENSALISTA,
      );

      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { tipo_publico: EBotContactAudience.MENSALISTA },
      });
      const eventData = prisma.funnelEvent.create.mock.calls[0][0].data;
      expect(eventData).not.toHaveProperty('tipo_publico');
    });

    it('preserva o subtipo existente quando a chamada nao manda um novo', async () => {
      currentStageIs(EFunnelStage.CONTATO_INICIADO);

      await service.moveStage(
        tenantId,
        numeroContato,
        EFunnelStage.PUBLICO_IDENTIFICADO,
        adminId,
      );

      expect(prisma.botContact.updateMany).not.toHaveBeenCalled();
    });
  });
});

describe('FunnelService.resumeConversation', () => {
  let prisma: {
    botLead: { findUnique: jest.Mock; upsert: jest.Mock };
    botContact: { findUnique: jest.Mock; updateMany: jest.Mock };
    funnelEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let webhook: { dispatch: jest.Mock };
  let service: FunnelService;

  const tenantId = 'tenant_123';
  const numeroContato = '5511999999999';
  const adminId = 'admin_1';

  beforeEach(() => {
    prisma = {
      botLead: { findUnique: jest.fn(), upsert: jest.fn() },
      botContact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c_1', status_bot: 'PAUSADO' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      funnelEvent: { create: jest.fn() },
      // resume le results[1] como o funnelEvent criado
      $transaction: jest.fn().mockResolvedValue([{ count: 1 }, { id: 'evt_resume' }]),
    };
    webhook = { dispatch: jest.fn().mockResolvedValue(undefined) };
    service = new FunnelService(prisma as any, webhook as any);
  });

  it('404 quando o contato nao existe', async () => {
    prisma.botContact.findUnique.mockResolvedValue(null);

    await expect(
      service.resumeConversation(tenantId, numeroContato, adminId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('despausa, registra quem assumiu e avisa o N8N mesmo sem mudar de estagio', async () => {
    prisma.botLead.findUnique.mockResolvedValue({ current_stage: EFunnelStage.OFERTA_FEITA });

    const evt = await service.resumeConversation(tenantId, numeroContato, adminId);

    expect(evt).toEqual({ id: 'evt_resume' });
    expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: tenantId, numero_contato: numeroContato },
      data: { status_bot: 'ATIVO', motivo_pausa: null },
    });
    expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          de_estagio: EFunnelStage.OFERTA_FEITA,
          para_estagio: EFunnelStage.OFERTA_FEITA,
          autor_tipo: 'humano',
          autor_id: adminId,
          motivo: RETOMADA_HUMANA_MOTIVO,
        }),
      }),
    );
    // sem mudanca de estagio nao ha upsert do lead
    expect(prisma.botLead.upsert).not.toHaveBeenCalled();
    expect(webhook.dispatch).toHaveBeenCalledWith(tenantId, 'evt_resume');
  });

  it('com estagio de retorno move o lead junto', async () => {
    prisma.botLead.findUnique.mockResolvedValue({ current_stage: EFunnelStage.OFERTA_FEITA });

    await service.resumeConversation(
      tenantId,
      numeroContato,
      adminId,
      EFunnelStage.FECHAMENTO_INICIADO,
    );

    expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          de_estagio: EFunnelStage.OFERTA_FEITA,
          para_estagio: EFunnelStage.FECHAMENTO_INICIADO,
        }),
      }),
    );
    expect(prisma.botLead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { current_stage: EFunnelStage.FECHAMENTO_INICIADO },
      }),
    );
  });

  it('contato sem lead usa CONTATO_INICIADO como estagio atual', async () => {
    prisma.botLead.findUnique.mockResolvedValue(null);

    await service.resumeConversation(tenantId, numeroContato, adminId);

    expect(prisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          de_estagio: EFunnelStage.CONTATO_INICIADO,
          para_estagio: EFunnelStage.CONTATO_INICIADO,
        }),
      }),
    );
  });
});

describe('FunnelStageChangeDto', () => {
  const build = (payload: Record<string, unknown>) =>
    validate(plainToInstance(FunnelStageChangeDto, payload));

  const errorsFor = (errors: { property: string }[], property: string) =>
    errors.filter((e) => e.property === property);

  it('exige motivo quando para_estagio e PERDIDO', async () => {
    const errors = await build({ para_estagio: EFunnelStage.PERDIDO });
    expect(errorsFor(errors, 'motivo')).toHaveLength(1);
  });

  it('recusa motivo vazio quando para_estagio e PERDIDO', async () => {
    const errors = await build({ para_estagio: EFunnelStage.PERDIDO, motivo: '' });
    expect(errorsFor(errors, 'motivo')).toHaveLength(1);
  });

  it('recusa motivo so com espacos quando para_estagio e PERDIDO', async () => {
    const errors = await build({ para_estagio: EFunnelStage.PERDIDO, motivo: '   ' });
    expect(errorsFor(errors, 'motivo')).toHaveLength(1);
  });

  it('aceita PERDIDO com motivo preenchido', async () => {
    const errors = await build({ para_estagio: EFunnelStage.PERDIDO, motivo: 'sem disponibilidade' });
    expect(errors).toHaveLength(0);
  });

  it('aceita os demais estagios sem motivo', async () => {
    const errors = await build({ para_estagio: EFunnelStage.OFERTA_FEITA });
    expect(errors).toHaveLength(0);
  });

  it('aceita motivo null explicito fora do PERDIDO (campo limpo no painel)', async () => {
    const errors = await build({ para_estagio: EFunnelStage.OFERTA_FEITA, motivo: null });
    expect(errors).toHaveLength(0);
  });

  it('recusa motivo null explicito quando para_estagio e PERDIDO', async () => {
    const errors = await build({ para_estagio: EFunnelStage.PERDIDO, motivo: null });
    expect(errorsFor(errors, 'motivo')).toHaveLength(1);
  });

  it('ainda valida o formato do motivo quando ele vem preenchido fora do PERDIDO', async () => {
    const errors = await build({ para_estagio: EFunnelStage.OFERTA_FEITA, motivo: 'x'.repeat(256) });
    expect(errorsFor(errors, 'motivo')).toHaveLength(1);
  });

  it('recusa estagio fora do enum', async () => {
    const errors = await build({ para_estagio: 'PAGAMENTO' });
    expect(errorsFor(errors, 'para_estagio')).toHaveLength(1);
  });

  it('aceita as 9 etapas do funil v2', async () => {
    for (const stage of Object.values(EFunnelStage)) {
      const errors = await build({
        para_estagio: stage,
        ...(stage === EFunnelStage.PERDIDO ? { motivo: 'motivo qualquer' } : {}),
      });
      expect(errors).toHaveLength(0);
    }
  });

  it('aceita os subtipos de publico e recusa valor fora do enum', async () => {
    const ok = await build({
      para_estagio: EFunnelStage.PUBLICO_IDENTIFICADO,
      tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA,
    });
    expect(ok).toHaveLength(0);

    const bad = await build({
      para_estagio: EFunnelStage.PUBLICO_IDENTIFICADO,
      tipo_publico: 'PROPRIETARIO',
    });
    expect(errorsFor(bad, 'tipo_publico')).toHaveLength(1);
  });
});
