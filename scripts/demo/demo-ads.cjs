/**
 * Anuncios do Meta da pousada demo. O setup grava o gasto por estes ad_id e o
 * simulador usa os mesmos ad_id como source_id das conversas que vem de anuncio,
 * entao gasto, conversas e reservas casam nas telas de Campanhas e Retorno.
 */
const ADS = [
  {
    adId: '120210000000000001', adName: 'Reels - Chale com hidro', adsetId: '120210000000000101',
    adsetName: 'Casais SP 25-45', campaignId: '120210000000001001', campaignName: 'Feriado de Novembro',
    dailySpend: 60, convRate: 0.18,
  },
  {
    adId: '120210000000000002', adName: 'Carrossel - Cafe colonial', adsetId: '120210000000000101',
    adsetName: 'Casais SP 25-45', campaignId: '120210000000001001', campaignName: 'Feriado de Novembro',
    dailySpend: 40, convRate: 0.12,
  },
  {
    adId: '120210000000000003', adName: 'Video - Familia na piscina', adsetId: '120210000000000102',
    adsetName: 'Familias PR/SC', campaignId: '120210000000001002', campaignName: 'Ferias de Verao',
    dailySpend: 80, convRate: 0.1,
  },
  {
    adId: '120210000000000004', adName: 'Imagem - Promo meio de semana', adsetId: '120210000000000103',
    adsetName: 'Remarketing site', campaignId: '120210000000001003', campaignName: 'Ocupacao meio de semana',
    dailySpend: 25, convRate: 0.22,
  },
];

module.exports = { ADS };
