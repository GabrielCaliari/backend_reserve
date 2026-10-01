import { BotConversationService } from './bot-conversation.service';

describe('BotConversationService (contrato v2)', () => {
  const contato = {
    numero_contato: '+55 (35) 98067-432', nome: 'Gabriel', status_bot: 'AGUARDANDO_PAGAMENTO',
    last_message_at: new Date('2026-10-01T10:00:00.000Z'), consentimento_lgpd: true,
    tipo_publico: 'LEAD', ocasiao: 'romantica',
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
});
