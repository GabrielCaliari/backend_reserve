import { BotEventProcessorService } from './bot-event-processor.service';
import { BotEventDto } from '../dtos/bot-event.dto';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';

/**
 * Cobre o lado do bot da migracao para o funil v2: e o unico caminho de escrita
 * de estagio que nao passa pelo DTO, entao os aliases das etapas antigas e o
 * subtipo de publico so estao protegidos aqui.
 */
describe('BotEventProcessorService — funil v2', () => {
  let prisma: {
    botLead: { findUnique: jest.Mock; upsert: jest.Mock };
    botContact: { updateMany: jest.Mock };
    funnelEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: BotEventProcessorService;
  let warn: jest.SpyInstance;

  const tenantId = 'tenant_123';
  const numeroContato = '5511999999999';

  const event = (eventType: string, payload: Record<string, unknown>): BotEventDto => ({
    event_id: '00000000-0000-4000-8000-000000000000',
    event_type: eventType,
    occurred_at: '2026-08-07T12:00:00.000Z',
    payload,
  });

  /** Le o `data` do unico funnelEvent.create empilhado no $transaction. */
  const eventData = () => prisma.funnelEvent.create.mock.calls[0][0].data;

  beforeEach(() => {
    prisma = {
      botLead: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      botContact: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      funnelEvent: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new BotEventProcessorService(prisma as any, { record: jest.fn() } as any);
    warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  const currentStageIs = (stage: EFunnelStage | null) =>
    prisma.botLead.findUnique.mockResolvedValue(stage ? { current_stage: stage } : null);

  describe('nomes das etapas', () => {
    it.each(Object.values(EFunnelStage))('aceita a etapa v2 %s', async (stage) => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: stage, motivo: 'x' }),
      );

      expect(eventData().para_estagio).toBe(stage);
      expect(warn).not.toHaveBeenCalled();
    });

    // O N8N nao sobe junto com o backend: um evento com nome antigo tem que
    // pousar na etapa equivalente, nunca voltar para a entrada do funil.
    it.each([
      ['NOVO', EFunnelStage.CONTATO_INICIADO],
      ['QUALIFICADO', EFunnelStage.QUALIFICADO],
      ['PAGAMENTO', EFunnelStage.FECHAMENTO_INICIADO],
      ['FECHADO', EFunnelStage.RESERVA_CONFIRMADA],
      ['FRIO', EFunnelStage.PERDIDO],
    ])('traduz o nome antigo %s para %s', async (legacy, expected) => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: legacy, motivo: 'x' }),
      );

      expect(eventData().para_estagio).toBe(expected);
    });

    it('cai na entrada do funil e avisa quando a etapa e desconhecida', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: 'INVENTADO' }),
      );

      expect(eventData().para_estagio).toBe(EFunnelStage.CONTATO_INICIADO);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/INVENTADO/));
    });
  });

  describe('eventos dedicados', () => {
    it('pagamento.solicitado vai para FECHAMENTO_INICIADO', async () => {
      await service.process(tenantId, event('pagamento.solicitado', { contato: numeroContato }));
      expect(eventData().para_estagio).toBe(EFunnelStage.FECHAMENTO_INICIADO);
    });

    it('lead.fechado vai para RESERVA_CONFIRMADA, nao para FECHAMENTO_INICIADO', async () => {
      await service.process(tenantId, event('lead.fechado', { contato: numeroContato }));
      expect(eventData().para_estagio).toBe(EFunnelStage.RESERVA_CONFIRMADA);
    });

    it('lead.pronto_para_fechar continua anotacao, sem mudar de estagio', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);

      await service.process(tenantId, event('lead.pronto_para_fechar', { contato: numeroContato }));

      expect(eventData()).toMatchObject({
        de_estagio: null,
        para_estagio: EFunnelStage.OFERTA_FEITA,
        motivo: 'TRANSFERIR',
      });
      expect(prisma.botLead.upsert).not.toHaveBeenCalled();
    });
  });

  describe('motivo do PERDIDO na ingestao', () => {
    it('avisa mas nao recusa o evento quando o bot perde um lead sem motivo', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);

      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: 'PERDIDO' }),
      );

      // Aceitar sem motivo e deliberado: o endpoint responde 202 e nunca
      // reprocessa, entao recusar perderia a transicao de vez.
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventData().motivo).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/PERDIDO/));
    });

    it('grava o motivo trimado quando o bot manda um', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', {
          contato: numeroContato,
          para: 'PERDIDO',
          motivo: '  achou caro  ',
        }),
      );

      expect(eventData().motivo).toBe('achou caro');
      expect(warn).not.toHaveBeenCalled();
    });

    it('corta o motivo no limite da coluna em vez de estourar o INSERT', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', {
          contato: numeroContato,
          para: 'PERDIDO',
          motivo: 'x'.repeat(300),
        }),
      );

      expect(eventData().motivo).toHaveLength(255);
    });

    it('nao quebra quando o motivo chega com um tipo que nao e string', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: 'PERDIDO', motivo: 42 }),
      );

      expect(eventData().motivo).toBe('42');
    });
  });

  describe('subtipo de publico', () => {
    it('grava o subtipo no contato, fora do log de estagios', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', {
          contato: numeroContato,
          para: 'PUBLICO_IDENTIFICADO',
          tipo_publico: 'hospede em estadia',
        }),
      );

      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        data: { tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA },
      });
      expect(eventData()).not.toHaveProperty('tipo_publico');
    });

    it.each(Object.values(EBotContactAudience))('aceita o subtipo %s', async (audience) => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', {
          contato: numeroContato,
          para: 'PUBLICO_IDENTIFICADO',
          tipo_publico: audience,
        }),
      );

      expect(prisma.botContact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tipo_publico: audience } }),
      );
    });

    it('ignora subtipo fora do enum em vez de derrubar o evento', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', {
          contato: numeroContato,
          para: 'PUBLICO_IDENTIFICADO',
          tipo_publico: 'PROPRIETARIO',
        }),
      );

      expect(prisma.botContact.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('evento sem tipo_publico nao apaga o subtipo ja identificado', async () => {
      await service.process(
        tenantId,
        event('lead.estagio_alterado', { contato: numeroContato, para: 'QUALIFICADO' }),
      );

      expect(prisma.botContact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('bot.pausado (handoff)', () => {
    it('pausa o contato e grava anotacao HANDOFF:<motivo> no log do funil', async () => {
      currentStageIs(EFunnelStage.OFERTA_FEITA);
      await service.process(
        tenantId,
        event('bot.pausado', { contato: numeroContato, motivo: 'pediu_humano' }),
      );
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status_bot: 'PAUSADO', motivo_pausa: 'pediu_humano' },
        }),
      );
      expect(prisma.funnelEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          numero_contato: numeroContato,
          de_estagio: null,
          para_estagio: EFunnelStage.OFERTA_FEITA,
          autor_tipo: 'bot',
          motivo: 'HANDOFF:pediu_humano',
          ocorrido_em: new Date('2026-08-07T12:00:00.000Z'),
        }),
      });
    });

    it('sem motivo no payload grava HANDOFF:nao_informado', async () => {
      await service.process(tenantId, event('bot.pausado', { contato: numeroContato }));
      expect(eventData().motivo).toBe('HANDOFF:nao_informado');
      expect(eventData().para_estagio).toBe(EFunnelStage.CONTATO_INICIADO);
    });

    it('bot.reativado nao gera anotacao (a retomada humana ja tem o proprio evento)', async () => {
      await service.process(tenantId, event('bot.reativado', { contato: numeroContato }));
      expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
    });
  });
});
