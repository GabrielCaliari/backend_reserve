import { NotFoundException } from '@nestjs/common';
import { BotIssueService } from './bot-issue.service';

const TENANT = 'tenant_1';
const AT = new Date('2026-10-19T15:13:11.168Z');

function issue(over: Record<string, unknown> = {}) {
  return {
    id: 'iss_1',
    tenant_id: TENANT,
    numero_contato: '5500970009951',
    categoria: 'tecnico',
    codigo: 'excecao',
    gravidade: 'alta',
    workflow: 'WF1 v29',
    no: '20k. Interpretar IA',
    etapa: null,
    mensagem: 'Cannot read x',
    mensagem_hospede: 'quero reservar',
    resposta_bot: null,
    contexto: {
      ultimas_mensagens: [{ m: 'quero reservar', em: '19/10 10:00', quem: 'user' }, 'lixo', { m: 1 }],
      url: 'http://n8n/execution/1',
    },
    socorro: true,
    status: 'ABERTO',
    source_event_id: 'ev_1',
    ocorrido_em: AT,
    ...over,
  };
}

const itemEsperado = {
  id: 'iss_1',
  numeroContato: '5500970009951',
  nomeContato: 'Gabriel Teste',
  categoria: 'tecnico',
  codigo: 'excecao',
  gravidade: 'alta',
  etapa: null,
  workflow: 'WF1 v29',
  no: '20k. Interpretar IA',
  mensagem: 'Cannot read x',
  socorro: true,
  status: 'ABERTO',
  ocorridoEm: AT,
};

describe('BotIssueService', () => {
  let prisma: any;
  let service: BotIssueService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: TENANT }) },
      botIssue: {
        findMany: jest.fn().mockResolvedValue([issue()]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(issue()),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(issue(data))),
      },
      botContact: {
        findMany: jest.fn().mockResolvedValue([{ numero_contato: '5500970009951', nome: 'Gabriel Teste' }]),
      },
    };
    service = new BotIssueService(prisma);
  });

  describe('list', () => {
    it('aplica periodo, categoria, codigo e status; ordena por ocorrido_em desc e pagina', async () => {
      const res = await service.list('client_1', {
        from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.000Z',
        categoria: 'tecnico', codigo: 'excecao', status: 'ABERTO', page: 2, limit: 20,
      });
      const where = {
        tenant_id: TENANT,
        ocorrido_em: { gte: new Date('2026-10-01T00:00:00.000Z'), lte: new Date('2026-10-31T23:59:59.000Z') },
        categoria: 'tecnico', codigo: 'excecao', status: 'ABERTO',
      };
      expect(prisma.botIssue.findMany).toHaveBeenCalledWith({
        where, orderBy: { ocorrido_em: 'desc' }, skip: 20, take: 20,
      });
      expect(prisma.botIssue.count).toHaveBeenCalledWith({ where });
      expect(res).toEqual({ items: [itemEsperado], total: 1 });
    });

    it('sem filtros usa so o tenant, limite 50 e pagina 1', async () => {
      await service.list('client_1', {});
      expect(prisma.botIssue.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT }, orderBy: { ocorrido_em: 'desc' }, skip: 0, take: 50,
      });
    });

    it('limite acima de 200 e cortado em 200', async () => {
      await service.list('client_1', { limit: 1000 });
      expect(prisma.botIssue.findMany.mock.calls[0][0].take).toBe(200);
    });

    it('issue sem numero tem nomeContato null', async () => {
      prisma.botIssue.findMany.mockResolvedValue([issue({ numero_contato: null })]);
      const res = await service.list('client_1', {});
      expect(res.items[0]).toMatchObject({ numeroContato: null, nomeContato: null });
    });

    it('cliente desconhecido devolve lista vazia', async () => {
      prisma.hotelClient.findUnique.mockResolvedValue(null);
      expect(await service.list('x', {})).toEqual({ items: [], total: 0 });
      expect(prisma.botIssue.findMany).not.toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('agrupa por codigo com groupBy, ordem desc, top 10', async () => {
      prisma.botIssue.count.mockResolvedValue(7);
      prisma.botIssue.groupBy.mockResolvedValue([
        { codigo: 'excecao', categoria: 'tecnico', _count: { _all: 5 } },
        { codigo: 'revisor_corrigiu', categoria: 'conversa', _count: { _all: 2 } },
      ]);
      const res = await service.summary('client_1', { from: '2026-10-01T00:00:00.000Z' });
      const where = { tenant_id: TENANT, ocorrido_em: { gte: new Date('2026-10-01T00:00:00.000Z') } };
      expect(prisma.botIssue.groupBy).toHaveBeenCalledWith({
        by: ['codigo', 'categoria'],
        where,
        _count: { _all: true },
        orderBy: { _count: { codigo: 'desc' } },
        take: 10,
      });
      expect(prisma.botIssue.count).toHaveBeenCalledWith({ where });
      expect(res).toEqual({
        total: 7,
        porCodigo: [
          { codigo: 'excecao', categoria: 'tecnico', quantidade: 5 },
          { codigo: 'revisor_corrigiu', categoria: 'conversa', quantidade: 2 },
        ],
      });
    });

    it('cliente desconhecido devolve resumo vazio', async () => {
      prisma.hotelClient.findUnique.mockResolvedValue(null);
      expect(await service.summary('x', {})).toEqual({ total: 0, porCodigo: [] });
    });
  });

  describe('detail', () => {
    it('devolve o item com mensagem do hospede, resposta, ultimas mensagens validas e url', async () => {
      const res = await service.detail('client_1', 'iss_1');
      expect(prisma.botIssue.findFirst).toHaveBeenCalledWith({ where: { id: 'iss_1', tenant_id: TENANT } });
      expect(res).toEqual({
        ...itemEsperado,
        mensagemHospede: 'quero reservar',
        respostaBot: null,
        ultimasMensagens: [{ m: 'quero reservar', em: '19/10 10:00', quem: 'user' }],
        url: 'http://n8n/execution/1',
      });
    });

    it('contexto apagado (LGPD) devolve listas vazias e url null', async () => {
      prisma.botIssue.findFirst.mockResolvedValue(issue({ contexto: null }));
      const res = await service.detail('client_1', 'iss_1');
      expect(res).toMatchObject({ ultimasMensagens: [], url: null });
    });

    it('404 quando a issue nao e do tenant do cliente', async () => {
      prisma.botIssue.findFirst.mockResolvedValue(null);
      await expect(service.detail('client_1', 'iss_x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404 quando o cliente nao existe', async () => {
      prisma.hotelClient.findUnique.mockResolvedValue(null);
      await expect(service.detail('x', 'iss_1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('muda o status da issue do tenant e devolve o item atualizado', async () => {
      const res = await service.updateStatus(TENANT, 'iss_1', 'CORRIGIDO');
      expect(prisma.botIssue.findFirst).toHaveBeenCalledWith({ where: { id: 'iss_1', tenant_id: TENANT } });
      expect(prisma.botIssue.update).toHaveBeenCalledWith({ where: { id: 'iss_1' }, data: { status: 'CORRIGIDO' } });
      expect(res).toEqual({ ...itemEsperado, status: 'CORRIGIDO' });
    });

    it('404 para issue de outro tenant, sem atualizar', async () => {
      prisma.botIssue.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus('outro_tenant', 'iss_1', 'VISTO')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.botIssue.update).not.toHaveBeenCalled();
    });
  });
});
