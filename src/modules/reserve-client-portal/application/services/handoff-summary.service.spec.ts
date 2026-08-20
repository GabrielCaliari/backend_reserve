import { NotFoundException } from '@nestjs/common';
import { HandoffSummaryService } from './handoff-summary.service';

describe('HandoffSummaryService.build', () => {
  const tenantId = 'tenant_1';
  const numero = '5535999990000';

  function buildPrisma(overrides: Record<string, unknown> = {}) {
    return {
      botContact: {
        findUnique: jest.fn().mockResolvedValue({
          numero_contato: numero, nome: 'Ana', tipo_publico: 'LEAD', motivo_pausa: 'pediu_humano',
        }),
      },
      botLead: {
        findUnique: jest.fn().mockResolvedValue({
          current_stage: 'FECHAMENTO_INICIADO', acomodacao_interesse: 'Chalé Lago',
          datas_interesse: { checkin: '2026-09-12', checkout: '2026-09-15' },
        }),
      },
      motorHold: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'h_1', valor_total: '1200.00', valor_antecipado: '600.00',
          checkin: new Date('2026-09-12T00:00:00Z'), checkout: new Date('2026-09-15T00:00:00Z'),
          expires_at: new Date('2026-08-20T12:00:00Z'),
        }),
      },
      botMessage: {
        findMany: jest.fn().mockResolvedValue([
          { role: 'assistant', content_preview: 'Segue o Pix', ocorrido_em: new Date('2026-08-20T11:05:00Z') },
          { role: 'user', content_preview: 'Quero falar com alguém', ocorrido_em: new Date('2026-08-20T11:00:00Z') },
        ]),
      },
      ...overrides,
    } as any;
  }

  it('monta o resumo estruturado e o texto pronto para nota interna', async () => {
    const service = new HandoffSummaryService(buildPrisma());
    const r = await service.build(tenantId, numero);
    expect(r).toMatchObject({
      numeroContato: numero,
      nome: 'Ana',
      estagio: 'FECHAMENTO_INICIADO',
      tipoPublico: 'LEAD',
      motivoPausa: 'pediu_humano',
      acomodacaoInteresse: 'Chalé Lago',
      datasInteresse: '12/09/2026 – 15/09/2026',
      holdAtivo: { holdId: 'h_1', valorTotal: 1200, valorAntecipado: 600, checkin: '2026-09-12', checkout: '2026-09-15' },
    });
    // cronologico (mais antiga primeiro), embora o banco devolva desc
    expect(r.ultimasMensagens.map((m) => m.contentPreview)).toEqual(['Quero falar com alguém', 'Segue o Pix']);
    expect(r.resumoTexto).toContain('Ana');
    expect(r.resumoTexto).toContain('Fechamento iniciado');
    expect(r.resumoTexto).toContain('pediu_humano');
    expect(r.resumoTexto).toContain('R$ 1.200,00');
    expect(r.resumoTexto).toContain('Quero falar com alguém');
  });

  it('sem lead nem hold devolve nulos e texto ainda util', async () => {
    const service = new HandoffSummaryService(
      buildPrisma({
        botLead: { findUnique: jest.fn().mockResolvedValue(null) },
        motorHold: { findFirst: jest.fn().mockResolvedValue(null) },
        botMessage: { findMany: jest.fn().mockResolvedValue([]) },
      }),
    );
    const r = await service.build(tenantId, numero);
    expect(r.estagio).toBe('CONTATO_INICIADO');
    expect(r.holdAtivo).toBeNull();
    expect(r.datasInteresse).toBeNull();
    expect(r.resumoTexto).toContain('Contato iniciado');
  });

  it('contato inexistente -> 404', async () => {
    const service = new HandoffSummaryService(
      buildPrisma({ botContact: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(service.build(tenantId, numero)).rejects.toBeInstanceOf(NotFoundException);
  });
});
