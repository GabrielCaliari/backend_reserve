/**
 * Smoke das leituras do painel do hotel contra a API local: pega todas as rotas
 * GET do Swagger que pertencem ao painel (hotel-portal, motor, settings,
 * tenant-capabilities), troca :tenantId/:clientId/:id pelos ids da pousada demo e
 * chama cada uma como super admin com o tenant selecionado.
 *
 * Sai com codigo 1 se alguma rota responder 5xx. 4xx sai listado (pode ser rota
 * que exige parametro de query ou recurso que a demo nao tem).
 *
 * Uso: node scripts/demo/smoke-routes.cjs
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.DEMO_API_ORIGIN || 'http://localhost:3002';
const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, '.demo-hotel.local.json'), 'utf-8'));
const PREFIXES = ['/api/hotel-portal', '/api/admin/hotel-portal', '/api/motor', '/api/settings', '/api/tenant-capabilities'];

const hoje = new Date();
const QUERY = {
  from: new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10),
  to: hoje.toISOString().slice(0, 10),
  period: '30d',
};

async function main() {
  const login = await fetch(`${BASE}/api/admin/authenticate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(CONF.superAdmin),
  }).then((r) => r.json());
  const headers = {
    authorization: `Bearer ${login.session_token}`,
    'session-id': login.session_id,
    'x-tenant-id': CONF.tenantId,
  };

  const spec = await fetch(`${BASE}/api/docs-json`).then((r) => r.json());
  const contato = await primeiroContato(headers);

  const rotas = Object.entries(spec.paths)
    .filter(([p, ops]) => ops.get && PREFIXES.some((pre) => p.startsWith(pre)))
    .map(([p, ops]) => ({ p, op: ops.get }));

  const resultado = { ok: [], c4xx: [], c5xx: [] };
  for (const { p, op } of rotas) {
    const url = new URL(BASE + p
      .replace(/\{tenantId\}/g, CONF.tenantId)
      .replace(/\{clientId\}|\{hotelClientId\}/g, CONF.clientId)
      .replace(/\{numeroContato\}|\{phone\}|\{numero\}/g, contato ?? '0')
      .replace(/\{id\}/g, p.includes('clients') ? CONF.clientId : CONF.tenantId)
      .replace(/\{[^}]+\}/g, 'x'));
    for (const param of op.parameters ?? []) {
      if (param.in === 'query' && QUERY[param.name]) url.searchParams.set(param.name, QUERY[param.name]);
    }
    const res = await fetch(url, { headers });
    const linha = `${res.status} GET ${p}`;
    if (res.status >= 500) resultado.c5xx.push(`${linha} ${(await res.text()).slice(0, 200)}`);
    else if (res.status >= 400) resultado.c4xx.push(`${linha} ${(await res.text()).slice(0, 160)}`);
    else resultado.ok.push(linha);
  }

  console.log(`Rotas GET testadas: ${rotas.length} | 2xx: ${resultado.ok.length} | 4xx: ${resultado.c4xx.length} | 5xx: ${resultado.c5xx.length}`);
  if (resultado.c4xx.length) console.log('\n4xx:\n' + resultado.c4xx.join('\n'));
  if (resultado.c5xx.length) console.log('\n5xx:\n' + resultado.c5xx.join('\n'));
  process.exit(resultado.c5xx.length ? 1 : 0);
}

async function primeiroContato(headers) {
  const res = await fetch(`${BASE}/api/hotel-portal/${CONF.clientId}/whatsapp/conversations?limit=1`, { headers });
  if (!res.ok) return null;
  const body = await res.json();
  return body.conversations?.[0]?.numeroContato ?? null;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
