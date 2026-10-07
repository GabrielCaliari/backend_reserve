import { BotEventProcessorService } from './bot-event-processor.service';

const T = 'tenant_1';
const PHONE = '553598067432';
const AT = '2026-10-01T10:00:00.000Z';

function contact(over: Record<string, unknown> = {}) {
  return {
    phone: PHONE, name: 'Gabriel Caliari', audience: 'LEAD', origin: 'anuncio',
    ctwa_clid: null, source_id: 'ad_123', link_code: null, bot_status: 'ATIVO', occasion: 'romantica',
    ...over,
  };
}

function evento(type: string, over: Record<string, unknown> = {}) {
  return { event_id: 'e1', occurred_at: AT, type, contact: contact(), stage: null, hold: null, data: {}, ...over } as any;
}

describe('BotEventProcessorService (contrato v2)', () => {
  let prisma: any;
  let attribution: { record: jest.Mock };
  let service: BotEventProcessorService;

  beforeEach(() => {
    prisma = {
      botContact: { upsert: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      botLead: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      funnelEvent: { create: jest.fn().mockResolvedValue({}) },
      botMessage: { create: jest.fn().mockResolvedValue({}) },
      followupAttempt: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      botIntegrationConfig: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
    };
    attribution = { record: jest.fn().mockResolvedValue(undefined) };
    service = new BotEventProcessorService(prisma, attribution as any);
  });

  describe('snapshot do contato', () => {
    it('aplica os campos do snapshot so se o evento nao for mais antigo que o ja aplicado', async () => {
      await service.process(T, evento('qualificado'));
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: {
          tenant_id: T, numero_contato: PHONE,
          OR: [{ snapshot_em: null }, { snapshot_em: { lte: new Date(AT) } }],
        },
        data: expect.objectContaining({
          nome: 'Gabriel Caliari', tipo_publico: 'LEAD', origem: 'anuncio',
          status_bot: 'ATIVO', ocasiao: 'romantica', snapshot_em: new Date(AT),
        }),
      });
    });

    it('bot_status fora do enum e ignorado, nao derruba o evento', async () => {
      await service.process(T, evento('qualificado', { contact: contact({ bot_status: 'INVENTADO' }) }));
      const data = prisma.botContact.updateMany.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('status_bot');
    });

    it('evento sem contact (e que nao e heartbeat) so avisa', async () => {
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
      await service.process(T, evento('qualificado', { contact: null }));
      expect(warn).toHaveBeenCalled();
      expect(prisma.botContact.upsert).not.toHaveBeenCalled();
    });

    it('tipo fora do catalogo (aviso.esgotou) com contact.phone aplica o snapshot e nao lanca', async () => {
      await expect(service.process(T, evento('aviso.esgotou'))).resolves.not.toThrow();
      expect(prisma.botContact.updateMany).toHaveBeenCalled();
    });

    it('reserva vista no PMS (sem contato) fica so no ledger, sem aviso', async () => {
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
      await service.process(T, evento('reserva.detectada_polling', { contact: null }));
      expect(warn).not.toHaveBeenCalled();
      expect(prisma.botContact.upsert).not.toHaveBeenCalled();
    });
  });

  describe('estagio', () => {
    it('muda de estagio gravando o log e a projecao na mesma transacao', async () => {
      prisma.botLead.findUnique.mockResolvedValue({ current_stage: 'QUALIFICADO', stage_em: null });
      await service.process(T, evento('acomodacao.apresentada', { stage: 'ACOMODACAO_APRESENTADA' }));
      expect(prisma.funnelEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          de_estagio: 'QUALIFICADO', para_estagio: 'ACOMODACAO_APRESENTADA',
          autor_tipo: 'bot', ocorrido_em: new Date(AT),
        }),
      });
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ current_stage: 'ACOMODACAO_APRESENTADA', stage_em: new Date(AT) }),
        }),
      );
    });

    it('eco de um estagio em que o lead ja esta nao duplica o log', async () => {
      prisma.botLead.findUnique.mockResolvedValue({ current_stage: 'PERDIDO', stage_em: new Date('2026-10-01T09:59:00.000Z') });
      await service.process(T, evento('painel.estagio', { stage: 'PERDIDO' }));
      expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
      expect(prisma.botLead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stage_em: new Date(AT) } }),
      );
    });

    it('evento de estagio atrasado nao volta o lead no tempo', async () => {
      prisma.botLead.findUnique.mockResolvedValue({
        current_stage: 'RESERVA_CONFIRMADA', stage_em: new Date('2026-10-01T11:00:00.000Z'),
      });
      await service.process(T, evento('qualificado', { stage: 'QUALIFICADO' }));
      expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
      expect(prisma.botLead.upsert).not.toHaveBeenCalled();
    });

    it('acao de humano entra no log como autor humano', async () => {
      await service.process(T, evento('painel.estagio', {
        stage: 'OFERTA_FEITA', actor: { type: 'human', id: 'usr_1' },
      }));
      expect(prisma.funnelEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ autor_tipo: 'humano', autor_id: 'usr_1' }),
      });
    });

    it('estagio desconhecido e ignorado com aviso', async () => {
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
      await service.process(T, evento('qualificado', { stage: 'INVENTADO' }));
      expect(warn).toHaveBeenCalled();
      expect(prisma.funnelEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('hold', () => {
    it('grava o hold no lead em centavos, com acomodacao e datas', async () => {
      await service.process(T, evento('hold.criado', {
        hold: {
          code: 'M57', status: 'AGUARDANDO', accommodation: 'Suíte Master',
          check_in: '2026-11-20', check_out: '2026-11-22', amount_cents: 104900, pms_reservation_id: 'r_30644146',
        },
      }));
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            hold_codigo: 'M57', hold_status: 'AGUARDANDO', hold_valor_cents: 104900,
            hold_pms_reservation_id: 'r_30644146', acomodacao_interesse: 'Suíte Master',
            datas_interesse: { checkin: '2026-11-20', checkout: '2026-11-22' },
            hold_em: new Date(AT),
          }),
        }),
      );
    });
  });

  describe('tipos', () => {
    it('contato.iniciado marca o inicio e registra a atribuicao', async () => {
      await service.process(T, evento('contato.iniciado', {
        stage: 'CONTATO_INICIADO',
        data: { origem: 'anuncio', ctwa_clid: 'clid_1', source_id: 'ad_123', link_code: null },
      }));
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T, numero_contato: PHONE, iniciado_em: null },
        data: { iniciado_em: new Date(AT) },
      });
      expect(attribution.record).toHaveBeenCalledWith(T, expect.objectContaining({
        numeroContato: PHONE, ctwaClid: 'clid_1', sourceId: 'ad_123', sourceType: 'ad',
      }));
    });

    it('mensagem do hospede corta o preview em 180 e marca follow-ups como respondidos', async () => {
      await service.process(T, evento('mensagem', {
        data: { role: 'user', kind: 'texto', content_preview: 'x'.repeat(400) },
      }));
      const msg = prisma.botMessage.create.mock.calls[0][0].data;
      expect(msg.role).toBe('user');
      expect(msg.content_preview).toHaveLength(180);
      expect(prisma.followupAttempt.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T, numero_contato: PHONE, status: 'sem_resposta', ocorrido_em: { lte: new Date(AT) } },
        data: { status: 'respondeu' },
      });
    });

    it('mensagem do bot nao mexe em follow-up', async () => {
      await service.process(T, evento('mensagem', { data: { role: 'assistant', kind: 'botoes', content_preview: 'oi' } }));
      expect(prisma.botMessage.create.mock.calls[0][0].data.tipo).toBe('botoes');
      expect(prisma.followupAttempt.updateMany).not.toHaveBeenCalled();
    });

    it('transferencia vira anotacao HANDOFF com o motivo', async () => {
      prisma.botLead.findUnique.mockResolvedValue({ current_stage: 'QUALIFICADO', stage_em: null });
      await service.process(T, evento('transferencia', { data: { motivo: 'pediu_humano', tag: 'x' } }));
      expect(prisma.funnelEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          de_estagio: null, para_estagio: 'QUALIFICADO', motivo: 'HANDOFF:pediu_humano',
        }),
      });
    });

    it('hold.expirado marca o lead para recuperar', async () => {
      await service.process(T, evento('hold.expirado', { data: { codigo: 'M57' } }));
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { recuperar: true } }),
      );
    });

    it('reserva.confirmada grava o valor e tira a etiqueta de recuperar', async () => {
      await service.process(T, evento('reserva.confirmada', {
        stage: 'RESERVA_CONFIRMADA', data: { codigo: 'M57', valor_cents: 104900 },
      }));
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { valor_confirmado_cents: 104900, recuperar: false } }),
      );
    });

    it('perdido guarda o motivo', async () => {
      await service.process(T, evento('perdido', { stage: 'PERDIDO', data: { motivo: 'caro' } }));
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { motivo_perda: 'caro' } }),
      );
    });

    it('followup.enviado entra por regua, sem resposta ate o hospede falar', async () => {
      await service.process(T, evento('followup.enviado', { data: { toque: 2, regua: 'pre_reserva' } }));
      expect(prisma.followupAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tentativa: 2, regua: 'pre_reserva', status: 'sem_resposta', ocorrido_em: new Date(AT),
        }),
      });
    });

    it('heartbeat guarda o instante e os dados, sem contato', async () => {
      const data = { bot_enabled: true, mode: 'hospedin', ai_enabled: true, active_conversations: 4, paused_awaiting_human: 1 };
      await service.process(T, evento('heartbeat', { contact: null, data }));
      expect(prisma.botIntegrationConfig.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T },
        data: { last_heartbeat_at: new Date(AT), last_heartbeat_data: data },
      });
      expect(prisma.botContact.upsert).not.toHaveBeenCalled();
    });
  });

  describe('replay idempotente (I2)', () => {
    const p2002 = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

    it('inserts da projecao carregam o event_id como source_event_id', async () => {
      await service.process(T, evento('mensagem', { data: { role: 'user', content_preview: 'oi' } }));
      await service.process(T, evento('transferencia', { data: { motivo: 'pediu_humano' } }));
      await service.process(T, evento('followup.enviado', { data: { toque: 1, regua: 'organico' } }));
      await service.process(T, evento('contato.iniciado', { data: { origem: 'organico' } }));
      expect(prisma.botMessage.create.mock.calls[0][0].data.source_event_id).toBe('e1');
      expect(prisma.funnelEvent.create.mock.calls[0][0].data.source_event_id).toBe('e1');
      expect(prisma.followupAttempt.create.mock.calls[0][0].data.source_event_id).toBe('e1');
      expect(attribution.record).toHaveBeenCalledWith(T, expect.objectContaining({ sourceEventId: 'e1' }));
    });

    it('replay de mensagem com o insert ja aplicado (P2002) roda os updates seguintes e nao lanca', async () => {
      prisma.botMessage.create.mockRejectedValueOnce(p2002());
      await expect(service.process(T, evento('mensagem', {
        data: { role: 'user', kind: 'texto', content_preview: 'oi' },
      }))).resolves.toBeUndefined();
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T, numero_contato: PHONE },
        data: { last_message_at: new Date(AT), last_user_message_at: new Date(AT) },
      });
      expect(prisma.followupAttempt.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T, numero_contato: PHONE, status: 'sem_resposta', ocorrido_em: { lte: new Date(AT) } },
        data: { status: 'respondeu' },
      });
    });

    it('replay de transferencia com a anotacao ja gravada ainda pausa o contato', async () => {
      prisma.funnelEvent.create.mockRejectedValueOnce(p2002());
      await service.process(T, evento('transferencia', { data: { motivo: 'pediu_humano' } }));
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: T, numero_contato: PHONE },
        data: { motivo_pausa: 'pediu_humano' },
      });
    });

    it('replay de followup.enviado ja gravado nao lanca', async () => {
      prisma.followupAttempt.create.mockRejectedValueOnce(p2002());
      await expect(service.process(T, evento('followup.enviado', { data: { toque: 1 } }))).resolves.toBeUndefined();
    });

    it('erro que nao e de unicidade continua subindo', async () => {
      prisma.botMessage.create.mockRejectedValueOnce(new Error('db fora'));
      await expect(service.process(T, evento('mensagem', { data: { role: 'user' } }))).rejects.toThrow('db fora');
    });
  });
});
