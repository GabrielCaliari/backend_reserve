/**
 * Valida a URL do canal reverso (contrato v2 §5). Em producao so aceita https
 * com dominio publico, para a URL configurada nao virar porta de SSRF contra a
 * rede interna. Fora de producao libera http e localhost (testes locais e ngrok).
 */
const HOSTS_INTERNOS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan)$/i;

function ipv4Privado(host: string): boolean {
  const partes = host.split('.').map(Number);
  if (partes.length !== 4 || partes.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = partes;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function motivoUrlPainelInvalida(url: string, producao = process.env.NODE_ENV === 'production'): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'URL invalida';
  }
  if (!producao) return null;
  if (parsed.protocol !== 'https:') return 'a URL do canal reverso precisa usar https';
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (HOSTS_INTERNOS.test(host) || ipv4Privado(host) || host.includes(':') || /^\d+$/.test(host)) {
    return 'a URL do canal reverso precisa apontar para um dominio publico';
  }
  return null;
}
