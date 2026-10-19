import { BotConversationService } from './bot-conversation.service';

describe('BotConversationService (contrato v2)', () => {
  const contato = {
    numero_contato: '+55 (35) 98067-432', nome: 'Gabriel', status_bot: 'AGUARDANDO_PAGAMENTO',
    last_message_at: new Date('2026-10-01T10:00:00.000Z'), consentimento_lgpd: true,
    tipo_publico: 'LEAD', ocasiao: 'romantica', origem: 'anuncio', source_id: 'ad_123',
  };
  let prisma: any;
  let service: BotConversationService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant_1' }) },
      botContact: {
        findMany: jest.fn().mockResolvedValue([contato]),
        findUnique: jest.fn().mockResolvedValue(contato),
      },
      botLead: {
        findMany: jest.fn().mockResolvedValue([{ numero_contato: contato.numero_contato, current_stage: 'FECHAMENTO_INICIADO' }]),
        findUnique: jest.fn().mockResolvedValue({
          current_stage: 'FECHAMENTO_INICIADO', hold_codigo: 'M57', hold_status: 'AGUARDANDO',
          hold_valor_cents: 104900, acomodacao_interesse: 'Suíte Master',
          datas_interesse: { checkin: '2026-11-20', checkout: '2026-11-22' },
        }),
      },
      botMessage: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new BotConversationService(prisma);
  });

  it('lista com link do WhatsApp Web (so digitos) e o status ampliado', async () => {
    const { conversations } = await service.list('client_1', {} as any);
    expect(conversations[0]).toMatchObject({
      statusBot: 'AGUARDANDO_PAGAMENTO',
      whatsappWebLink: 'https://web.whatsapp.com/send?phone=553598067432',
      currentStage: 'FECHAMENTO_INICIADO',
    });
    expect(conversations[0]).not.toHaveProperty('chatwootDeepLink');
  });

  it('ordena por ultima mensagem com contatos sem mensagem no fim', async () => {
    await service.list('client_1', {} as any);
    expect(prisma.botContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { last_message_at: { sort: 'desc', nulls: 'last' } } }),
    );
  });

  it('detalhe traz ocasiao e o hold em reais', async () => {
    const { contact } = await service.detail('client_1', contato.numero_contato);
    expect(contact.ocasiao).toBe('romantica');
    expect(contact.hold).toEqual({
      codigo: 'M57', status: 'AGUARDANDO', acomodacao: 'Suíte Master',
      checkIn: '2026-11-20', checkOut: '2026-11-22', valor: 1049,
    });
  });

  it('sem hold no lead, hold e null', async () => {
    prisma.botLead.findUnique.mockResolvedValue({ current_stage: 'QUALIFICADO', hold_codigo: null, hold_status: null });
    const { contact } = await service.detail('client_1', contato.numero_contato);
    expect(contact.hold).toBeNull();
  });

  it('lista filtra por audience no banco e traz origem/sourceId', async () => {
    const { conversations } = await service.list('client_1', { audience: 'LEAD' } as any);
    expect(prisma.botContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: 'tenant_1', tipo_publico: 'LEAD' }) }),
    );
    expect(conversations[0]).toMatchObject({ tipoPublico: 'LEAD', origem: 'anuncio', sourceId: 'ad_123' });
  });

  it('lista com to data pura inclui o dia inteiro em Brasilia', async () => {
    await service.list('client_1', { from: '2026-10-19', to: '2026-10-19' } as any);
    expect(prisma.botContact.findMany.mock.calls[0][0].where.last_message_at).toEqual({
      gte: new Date('2026-10-19T03:00:00.000Z'),
      lt: new Date('2026-10-20T03:00:00.000Z'),
    });
  });

  it('lista sem audience nao filtra por tipo_publico', async () => {
    await service.list('client_1', {} as any);
    expect(prisma.botContact.findMany.mock.calls[0][0].where).not.toHaveProperty('tipo_publico');
  });

  describe('historico paginado', () => {
    const msg = (min: number) => ({
      role: 'user', tipo: 'texto', content_preview: 'p' + min, content: 'texto inteiro ' + min,
      media_kind: min === 2 ? 'audio' : null, media_text: min === 2 ? 'transcricao' : null, caption: null,
      ocorrido_em: new Date(Date.UTC(2026, 9, 19, 10, min)),
    });

    it('limit=2 com 3 mensagens devolve as 2 mais recentes em ordem asc e hasMore', async () => {
      prisma.botMessage.findMany.mockResolvedValue([msg(3), msg(2), msg(1)]); // desc, limit+1
      const r = await service.detail('client_1', contato.numero_contato, { limit: 2 });
      expect(prisma.botMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { ocorrido_em: 'desc' }, take: 3 }),
      );
      expect(r.hasMore).toBe(true);
      expect(r.messages.map((m) => m.contentPreview)).toEqual(['p2', 'p3']);
      expect(r.messages[0]).toMatchObject({
        content: 'texto inteiro 2', mediaKind: 'audio', mediaText: 'transcricao', caption: null,
      });
    });

    it('sem query usa 200 e hasMore false quando cabe tudo', async () => {
      prisma.botMessage.findMany.mockResolvedValue([msg(2), msg(1)]);
      const r = await service.detail('client_1', contato.numero_contato);
      expect(prisma.botMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 201 }));
      expect(r.hasMore).toBe(false);
      expect(r.messages.map((m) => m.contentPreview)).toEqual(['p1', 'p2']);
    });

    it('before filtra por ocorrido_em anterior', async () => {
      await service.detail('client_1', contato.numero_contato, { before: '2026-10-19T10:02:00.000Z' });
      expect(prisma.botMessage.findMany.mock.calls[0][0].where).toMatchObject({
        ocorrido_em: { lt: new Date('2026-10-19T10:02:00.000Z') },
      });
    });
  });
});
