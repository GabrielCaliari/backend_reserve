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
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      botIssue: { create: jest.fn().mockResolvedValue({}) },
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

  describe('conversa inteira (lote v29)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lote = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '__fixtures__', 'lote-v29.json'), 'utf-8'));
    const evt = (id: string) => lote.events.find((e: any) => e.event_id === id);
    const p2002 = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

    beforeEach(() => {
      prisma.botMessage.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    });

    it('texto grava o conteudo inteiro e a previa com no maximo 180', async () => {
      const longo = 'a'.repeat(500);
      await service.process('cli_dona_tereza', { ...evt('msg-36227'), data: { ...evt('msg-36227').data, content: longo, content_preview: longo } });
      const msg = prisma.botMessage.create.mock.calls[0][0].data;
      expect(msg.content).toBe(longo);
      expect(msg.content_preview).toHaveLength(180);
      expect(msg.wamid).toBe('wamid.g1');
      expect(msg.media_kind).toBeNull();
    });

    it('texto da fixture grava content igual ao enviado', async () => {
      await service.process('cli_dona_tereza', evt('msg-36227'));
      expect(prisma.botMessage.create.mock.calls[0][0].data).toMatchObject({
        content: 'quero reservar para 2 no fim de semana que vem', wamid: 'wamid.g1',
      });
    });

    it('audio grava media_kind e a transcricao em media_text', async () => {
      await service.process('cli_dona_tereza', evt('msg-36228'));
      expect(prisma.botMessage.create.mock.calls[0][0].data).toMatchObject({
        tipo: 'audio', media_kind: 'audio', media_text: 'oi tudo bem queria saber do chalé', wamid: 'wamid.g2',
      });
    });

    it('mensagem do bot sem wamid grava wamid nulo', async () => {
      await service.process('cli_dona_tereza', evt('msg-36229'));
      expect(prisma.botMessage.create.mock.calls[0][0].data.wamid).toBeNull();
    });

    it('wamid repetido (P2002) segue como duplicado', async () => {
      prisma.botMessage.create.mockRejectedValueOnce(p2002());
      await expect(service.process('cli_dona_tereza', evt('msg-36227'))).resolves.toBeUndefined();
    });

    it('audio.transcrito atualiza a mensagem por wamid', async () => {
      await service.process('cli_dona_tereza', evt('aud-36228'));
      expect(prisma.botMessage.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: 'cli_dona_tereza', wamid: 'wamid.g2' },
        data: { media_kind: 'audio', media_text: 'oi tudo bem queria saber do chalé' },
      });
    });

    it('audio.transcrito sem wamid e ignorado', async () => {
      await service.process(T, evento('audio.transcrito', { data: { transcricao: 'x' } }));
      expect(prisma.botMessage.updateMany).not.toHaveBeenCalled();
    });

    it('jornada.enviada vira linha de sistema sem mexer em last_message_at', async () => {
      const e = lote.events.find((x: any) => x.type === 'jornada.enviada');
      await service.process('cli_dona_tereza', e);
      expect(prisma.botMessage.create.mock.calls[0][0].data).toMatchObject({
        role: 'assistant', tipo: 'sistema',
        content: 'Jornada: avaliação enviada (modelo avaliacao)',
        content_preview: 'Jornada: avaliação enviada (modelo avaliacao)',
        source_event_id: e.event_id,
      });
      const tocouUltima = prisma.botContact.updateMany.mock.calls.some((c: any[]) => 'last_message_at' in (c[0].data ?? {}));
      expect(tocouUltima).toBe(false);
    });

    it('jornada pendente sem modelo e toque desconhecido', async () => {
      await service.process(T, evento('jornada.enviada', { data: { toque: 'vespera', via: 'pendente' } }));
      expect(prisma.botMessage.create.mock.calls[0][0].data.content).toBe('Jornada: véspera pendente');
      await service.process(T, evento('jornada.enviada', { data: { toque: 'outro', via: 'texto' } }));
      expect(prisma.botMessage.create.mock.calls[1][0].data.content).toBe('Jornada: outro enviada');
    });
  });

  describe('erros e socorro do bot (lote v29)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lote = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '__fixtures__', 'lote-v29.json'), 'utf-8'));
    const evt = (id: string) => lote.events.find((e: any) => e.event_id === id);
    const TENANT = 'cli_dona_tereza';
    const FONE = '5500970009951';
    const ERRO_TECNICO = 'ccc495c8-d6bc-4742-a77e-779b7a3b4651';
    const ERRO_CONVERSA = '405943d4-7529-4d11-9be6-86b44aed7128';
    const SOCORRO = '7ccc96ae-e938-47c6-849f-40f1db7c2570';
    const p2002 = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

    it('bot.erro tecnico grava a issue com o data inteiro em contexto', async () => {
      const e = evt(ERRO_TECNICO);
      await service.process(TENANT, e);
      expect(prisma.botIssue.create).toHaveBeenCalledWith({
        data: {
          tenant_id: TENANT,
          numero_contato: FONE,
          categoria: 'tecnico',
          codigo: 'excecao',
          gravidade: 'alta',
          workflow: 'WF1 v29',
          no: '20k. Interpretar IA',
          etapa: null,
          mensagem: 'Cannot read x',
          mensagem_hospede: 'quero reservar',
          resposta_bot: null,
          contexto: e.data,
          socorro: true,
          ocorrido_em: new Date(e.occurred_at),
          source_event_id: ERRO_TECNICO,
        },
      });
    });

    it('bot.erro de conversa grava categoria, gravidade baixa e socorro false; nao mexe no contato', async () => {
      await service.process(TENANT, evt(ERRO_CONVERSA));
      expect(prisma.botIssue.create.mock.calls[0][0].data).toMatchObject({
        categoria: 'conversa', codigo: 'revisor_corrigiu', gravidade: 'baixa', socorro: false,
        resposta_bot: 'Confirmo com a equipe',
      });
      const pausou = prisma.botContact.updateMany.mock.calls.some((c: any[]) => c[0].data?.status_bot === 'PAUSADO');
      expect(pausou).toBe(false);
      expect(prisma.botLead.upsert).not.toHaveBeenCalled();
    });

    it('bot.erro sem campos usa os padroes', async () => {
      await service.process(T, evento('bot.erro', { data: { categoria: 'inventada', gravidade: 'xx' } }));
      expect(prisma.botIssue.create.mock.calls[0][0].data).toMatchObject({
        categoria: 'tecnico', codigo: 'desconhecido', gravidade: 'media', socorro: false,
      });
    });

    it('bot.erro sem contato ainda grava a issue sem numero', async () => {
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
      await service.process(T, evento('bot.erro', { contact: null, data: { codigo: 'excecao' } }));
      expect(prisma.botIssue.create.mock.calls[0][0].data).toMatchObject({ numero_contato: null, codigo: 'excecao' });
      expect(prisma.botContact.upsert).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('replay de bot.erro ja gravado (P2002) nao lanca', async () => {
      prisma.botIssue.create.mockRejectedValueOnce(p2002());
      await expect(service.process(TENANT, evt(ERRO_TECNICO))).resolves.toBeUndefined();
    });

    it('bot.socorro grava issue de socorro, pausa o contato e marca socorro_em', async () => {
      const e = evt(SOCORRO);
      const at = new Date(e.occurred_at);
      await service.process(TENANT, e);
      expect(prisma.botIssue.create.mock.calls[0][0].data).toMatchObject({
        tenant_id: TENANT, numero_contato: FONE, categoria: 'socorro', codigo: 'erros_bot#1',
        gravidade: 'alta', socorro: true, etapa: 'S12', workflow: 'WF1', no: '20k',
        contexto: e.data, source_event_id: SOCORRO, ocorrido_em: at,
      });
      expect(prisma.botContact.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT, numero_contato: FONE, OR: [{ snapshot_em: null }, { snapshot_em: { lte: at } }] },
        data: { status_bot: 'PAUSADO' },
      });
      expect(prisma.botLead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { socorro_em: at } }),
      );
    });

    it('bot.socorro com snapshot ATIVO no proprio evento: o socorro prevalece (handler roda depois do snapshot)', async () => {
      await service.process(TENANT, evt(SOCORRO));
      const ordemLimpeza = prisma.botLead.updateMany.mock.invocationCallOrder[0];
      const ordemMarca = prisma.botLead.upsert.mock.invocationCallOrder[0];
      expect(ordemLimpeza).toBeLessThan(ordemMarca);
      const ordemAtivo = prisma.botContact.updateMany.mock.invocationCallOrder[0];
      const pausa = prisma.botContact.updateMany.mock.calls.findIndex((c: any[]) => c[0].data?.status_bot === 'PAUSADO');
      expect(ordemAtivo).toBeLessThan(prisma.botContact.updateMany.mock.invocationCallOrder[pausa]);
    });

    it('bot.socorro sem codigo_erro usa o motivo; sem os dois, usa socorro', async () => {
      await service.process(T, evento('bot.socorro', { data: { motivo: 'pediu_humano' } }));
      expect(prisma.botIssue.create.mock.calls[0][0].data.codigo).toBe('pediu_humano');
      await service.process(T, evento('bot.socorro', { event_id: 'e2', data: {} }));
      expect(prisma.botIssue.create.mock.calls[1][0].data).toMatchObject({ codigo: 'socorro', etapa: null });
    });

    it('lote v29: bot.socorro seguido de eventos ATIVO no mesmo instante mantem PAUSADO e o socorro', async () => {
      // Estado simulado do contato e do lead, aplicando os filtros que o projetor manda.
      const contato: Record<string, unknown> = {};
      const lead: { socorro_em: Date | null } = { socorro_em: null };
      prisma.botContact.updateMany.mockImplementation(({ data }: any) => {
        Object.assign(contato, data);
        return Promise.resolve({ count: 1 });
      });
      prisma.botLead.findUnique.mockImplementation(() => Promise.resolve({ ...lead }));
      prisma.botLead.upsert.mockImplementation(({ update }: any) => {
        Object.assign(lead, update);
        return Promise.resolve({});
      });
      prisma.botLead.updateMany.mockImplementation(({ where, data }: any) => {
        const lt: Date | undefined = where.socorro_em?.lt;
        if (lead.socorro_em && lt && lead.socorro_em.getTime() < lt.getTime()) Object.assign(lead, data);
        return Promise.resolve({ count: 1 });
      });

      const socorro = evt(SOCORRO);
      const at = new Date(socorro.occurred_at);
      await service.process(TENANT, socorro);
      expect(contato.status_bot).toBe('PAUSADO');

      const jornada = lote.events.find((x: any) => x.type === 'jornada.enviada');
      const feedback = lote.events.find((x: any) => x.type === 'hospede.feedback');
      const erro = { ...evt(ERRO_CONVERSA), contact: { ...evt(ERRO_CONVERSA).contact, bot_status: 'ATIVO' } };
      const mensagem = { ...evt('msg-36229'), occurred_at: socorro.occurred_at, contact: { phone: FONE, bot_status: 'ATIVO' } };
      for (const e of [jornada, feedback, erro, mensagem]) {
        expect(e.occurred_at).toBe(socorro.occurred_at);
        await service.process(TENANT, e);
      }

      expect(contato.status_bot).toBe('PAUSADO');
      // Os outros campos do snapshot continuam valendo.
      expect(contato.nome).toBe('Gabriel Teste');
      // socorro_em intacto => etiqueta SOCORRO no card.
      expect(lead.socorro_em).toEqual(at);

      // Um ATIVO estritamente mais novo libera a pausa e a etiqueta.
      await service.process(TENANT, { ...mensagem, event_id: 'msg-depois', occurred_at: '2026-10-19T15:20:00.000Z' });
      expect(contato.status_bot).toBe('ATIVO');
      expect(lead.socorro_em).toBeNull();
    });

    describe('snapshot ATIVO devolve o atendimento ao bot', () => {
      // Simula o filtro do updateMany sobre um lead com socorro_em gravado.
      function leadComSocorro(socorroEm: Date) {
        const lead = { socorro_em: socorroEm as Date | null };
        prisma.botLead.updateMany.mockImplementation(({ where, data }: any) => {
          const lt: Date | undefined = where.socorro_em?.lt;
          if (lead.socorro_em && lt && lead.socorro_em.getTime() < lt.getTime()) {
            Object.assign(lead, data);
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        });
        return lead;
      }

      it('snapshot ATIVO posterior ao socorro zera socorro_em', async () => {
        const lead = leadComSocorro(new Date('2026-10-01T09:00:00.000Z'));
        await service.process(T, evento('mensagem', { data: { role: 'assistant', content_preview: 'oi' } }));
        expect(prisma.botLead.updateMany).toHaveBeenCalledWith({
          where: { tenant_id: T, numero_contato: PHONE, socorro_em: { lt: new Date(AT) } },
          data: { socorro_em: null },
        });
        expect(lead.socorro_em).toBeNull();
      });

      it('snapshot ATIVO anterior ao socorro nao zera', async () => {
        const socorroEm = new Date('2026-10-01T11:00:00.000Z');
        const lead = leadComSocorro(socorroEm);
        await service.process(T, evento('mensagem', { data: { role: 'assistant', content_preview: 'oi' } }));
        expect(lead.socorro_em).toEqual(socorroEm);
      });

      it('snapshot sem bot_status ATIVO nao mexe no socorro', async () => {
        await service.process(T, evento('qualificado', { contact: contact({ bot_status: 'PAUSADO' }) }));
        expect(prisma.botLead.updateMany).not.toHaveBeenCalled();
      });
    });
  });
});
