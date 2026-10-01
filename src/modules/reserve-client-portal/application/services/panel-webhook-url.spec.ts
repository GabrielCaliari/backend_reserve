import { motivoUrlPainelInvalida } from './panel-webhook-url';

describe('motivoUrlPainelInvalida (SSRF do canal reverso)', () => {
  it.each([
    'https://bot.reservemkt.com.br/webhook/painel',
    'https://flakily-scuff-tackle.ngrok-free.dev/webhook/painel',
  ])('aceita https com dominio publico em producao: %s', (url) => {
    expect(motivoUrlPainelInvalida(url, true)).toBeNull();
  });

  it.each([
    'http://bot.reservemkt.com.br/webhook/painel',
    'https://localhost/webhook',
    'https://127.0.0.1/webhook',
    'https://10.0.0.5/webhook',
    'https://172.20.1.1/webhook',
    'https://192.168.0.10/webhook',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/webhook',
    'https://2130706433/webhook',
    'https://n8n.internal/webhook',
    'nao-e-url',
  ])('recusa em producao: %s', (url) => {
    expect(motivoUrlPainelInvalida(url, true)).not.toBeNull();
  });

  it('fora de producao libera localhost (testes locais)', () => {
    expect(motivoUrlPainelInvalida('http://127.0.0.1:19001/webhook', false)).toBeNull();
  });
});
