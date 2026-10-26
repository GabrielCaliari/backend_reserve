import { RoiAnalysisService } from './roi-analysis.service';
import { PeriodComparisonService } from '../../../../shared/analytics/period-comparison.service';

const FROM = new Date('2026-10-01T00:00:00.000Z');
const TO = new Date('2026-10-31T23:59:59.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('RoiAnalysisService — Nível 3 (bot_reservas)', () => {
  let prisma: any;
  let service: RoiAnalysisService;

  beforeEach(() => {
    prisma = {
      hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 't1' }) },
      // sumSpend: com channel = Meta (nivel3), sem channel = total (nivel1)
      campaignMetric: {
        aggregate: jest.fn(({ where }) =>
          Promise.resolve({ _sum: { spend: where.channel === 'META_ADS' ? 500 : 800 } }),
        ),
      },
      conversationAttribution: { count: jest.fn().mockResolvedValue(10), findMany: jest.fn() },
      attributionSettings: { findUnique: jest.fn().mockResolvedValue({ window_days: 30 }) },
      botIntegrationConfig: { findUnique: jest.fn().mockResolvedValue({ active: true }) },
      funnelEvent: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      botReservation: { findMany: jest.fn() },
    };
    service = new RoiAnalysisService(prisma, new PeriodComparisonService());
  });

  /** O nivel2 chama findMany duas vezes antes (safra da qualificacao e
   * buildRoiByCampaign); o nivel3 e a 3a chamada. */
  function attributionsForNivel3(rows: unknown[]) {
    prisma.conversationAttribution.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(rows);
  }

  it('devolve gasto e custo por conversa em centavos, como o resto do dinheiro do contrato', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue(null);
    const res: any = await service.getRoi('c1', FROM, TO);
    // campaign_metrics guarda 800 reais; 10 conversas
    expect(res.data.nivel1.spend.value).toBe(80000);
    expect(res.data.nivel1.costPerConversation.value).toBe(8000);
  });

  it('taxa de qualificacao conta contatos distintos da safra do periodo', async () => {
    prisma.conversationAttribution.findMany
      .mockResolvedValueOnce([{ numero_contato: 'a' }, { numero_contato: 'b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.funnelEvent.findMany.mockResolvedValueOnce([{ numero_contato: 'a' }]);
    prisma.botReservation.findMany.mockResolvedValue([]);

    const res: any = await service.getRoi('c1', FROM, TO);
    expect(prisma.funnelEvent.findMany.mock.calls[0][0].where.numero_contato).toEqual({ in: ['a', 'b'] });
    // 1 qualificado / 10 conversas; a taxa nunca soma eventos soltos de fora da safra
    expect(res.data.nivel2.qualificationRate).toBe(10);
    expect(res.data.nivel2.costPerQualifiedLead).toBe(80000);
  });

  it('casa a reserva com a conversa do mesmo numero dentro da janela e calcula ROAS so com o Meta', async () => {
    const confirmada = new Date('2026-10-10T12:00:00.000Z');
    prisma.botReservation.findMany.mockResolvedValue([
      { numero_contato: '5535999', valor_cents: 150000, confirmado_em: confirmada, source_id: 'ad_1', ctwa_clid: null },
      { numero_contato: '5535888', valor_cents: 50000, confirmado_em: confirmada, source_id: null, ctwa_clid: null },
      // sem conversa atribuida: nao conta
      { numero_contato: '5535777', valor_cents: 99900, confirmado_em: confirmada, source_id: null, ctwa_clid: null },
    ]);
    attributionsForNivel3([
      { numero_contato: '5535999', ocorrido_em: new Date(confirmada.getTime() - 2 * DAY), fonte: 'anuncio' },
      { numero_contato: '5535888', ocorrido_em: new Date(confirmada.getTime() - 1 * DAY), fonte: 'organico' },
    ]);

    const res: any = await service.getRoi('c1', FROM, TO);
    const n3 = res.data.nivel3;

    expect(n3.revenueAttributed).toEqual({ value: 200000, currency: 'BRL' });
    expect(n3.revenueFromAds).toEqual({ value: 150000, currency: 'BRL' });
    expect(n3.adSpend).toEqual({ value: 50000, currency: 'BRL' });
    expect(n3.roas).toBe(3);
    expect(n3.reservations).toBe(2);
    expect(n3.avgTicket).toEqual({ value: 100000, currency: 'BRL' });
    expect(n3.leadToReservationRate).toBe(20);
  });

  it('conversa fora da janela ou depois da confirmacao nao atribui', async () => {
    const confirmada = new Date('2026-10-20T12:00:00.000Z');
    prisma.botReservation.findMany.mockResolvedValue([
      { numero_contato: '5535999', valor_cents: 100000, confirmado_em: confirmada, source_id: null, ctwa_clid: null },
    ]);
    attributionsForNivel3([
      { numero_contato: '5535999', ocorrido_em: new Date(confirmada.getTime() + DAY), fonte: 'anuncio' },
      { numero_contato: '5535999', ocorrido_em: new Date(confirmada.getTime() - 31 * DAY), fonte: 'anuncio' },
    ]);

    const res: any = await service.getRoi('c1', FROM, TO);
    const n3 = res.data.nivel3;
    expect(n3.reservations).toBe(0);
    expect(n3.revenueAttributed.value).toBe(0);
    expect(n3.roas).toBe(0);
  });

  it('sem bot ativo nao devolve nivel3', async () => {
    prisma.botIntegrationConfig.findUnique.mockResolvedValue(null);
    const res: any = await service.getRoi('c1', FROM, TO);
    const payload = res.data;
    expect(payload.nivel3).toBeUndefined();
    expect(prisma.botReservation.findMany).not.toHaveBeenCalled();
  });
});
