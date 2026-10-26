/**
 * Cria o hotel de demonstracao no banco LOCAL, pelas rotas reais da API:
 *   super admin (direto no banco, como scripts/create-super-admin.ts)
 *   -> POST /admin/authenticate
 *   -> POST /tenants
 *   -> POST /admin/hotel-portal/clients        (cria tambem o login do hotel)
 *   -> POST /admin/hotel-portal/:tenantId/bot-integration-config  (chave do bot)
 * e grava gasto do Meta Ads por anuncio (ad_metrics + campaign_metrics) dos
 * ultimos 30 dias, com os mesmos ad_id que o simulador do bot usa.
 *
 * Saida: scripts/demo/.demo-hotel.local.json (gitignored) com ids, chave do bot
 * e logins. Idempotente: rodar de novo reaproveita o que ja existe.
 *
 * Uso (com a API local de pe, ver start-local.cjs):
 *   node scripts/demo/setup-demo-hotel.cjs
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { ADS } = require('./demo-ads.cjs');

const API = process.env.DEMO_API_URL || 'http://localhost:3002/api';
const DB = process.env.DEMO_DATABASE_URL || 'postgresql://test:test@127.0.0.1:15432/reserve_demo';
const OUT = path.join(__dirname, '.demo-hotel.local.json');

const TENANT = { name: 'Pousada Demo Reserve', slug: 'pousada-demo' };
const BOT_REF = 'cli_pousada_demo';

if (!/127\.0\.0\.1|localhost/.test(DB)) {
  console.error('Recusado: banco nao e local.');
  process.exit(1);
}

function readEnvKey(key) {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '..', '.env'), 'utf-8');
  const line = envFile.split('\n').find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim() : '';
}

function cuid() {
  const random = crypto.randomBytes(10).toString('base64url').substring(0, 14);
  return `c${Date.now().toString(36)}${random}`.substring(0, 25);
}

function strongPassword() {
  return `Demo-${crypto.randomBytes(6).toString('base64url')}9a!`;
}

async function api(method, url, { token, sessionId, tenantId, body } = {}) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}`, 'session-id': sessionId } : {}),
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function must(result, label) {
  if (result.status >= 400) {
    throw new Error(`${label} falhou (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

async function ensureSuperAdmin(db, saved) {
  if (saved.superAdmin) return saved.superAdmin;
  const email = 'superadmin@demo.local';
  const password = strongPassword();
  const privateKey = readEnvKey('ENCRYPT_PRIVATE_KEY');
  if (!privateKey) throw new Error('ENCRYPT_PRIVATE_KEY ausente no .env');

  const existing = await db.query('SELECT id FROM "Admin" WHERE email = $1', [email]);
  if (existing.rows.length) throw new Error(`${email} ja existe mas nao esta no ${OUT}; apague o admin ou o banco demo`);

  // Hash v1 (856 iteracoes), igual a create-super-admin.ts; o login re-hasheia para v2.
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt + privateKey, 856, 64, 'sha512').toString('hex');
  const now = new Date().toISOString();
  const adminId = cuid();
  await db.query(
    `INSERT INTO "Admin" (id, name, email, role, active, created_at, updated_at)
     VALUES ($1, 'Super Admin Demo', $2, 'super_admin', true, $3, $3)`,
    [adminId, email, now],
  );
  await db.query(
    `INSERT INTO "AdminCredential" (id, admin_id, hash, salt, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)`,
    [cuid(), adminId, hash, salt, now],
  );
  return { email, password };
}

async function seedAdSpend(db, clientId) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let d = 30; d >= 0; d--) {
    const day = new Date(today.getTime() - d * 86400000);
    const byCampaign = new Map();
    for (const ad of ADS) {
      // Gasto diario com variacao, em reais (campaign_metrics/ad_metrics sao em reais).
      const spend = Math.round(ad.dailySpend * (0.7 + Math.random() * 0.6) * 100) / 100;
      const impressions = Math.round(spend * (90 + Math.random() * 40));
      const clicks = Math.round(impressions * (0.012 + Math.random() * 0.01));
      const conversations = Math.max(0, Math.round(clicks * ad.convRate));
      await db.query(
        `INSERT INTO ad_metrics (id, client_id, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name,
           metric_date, spend, impressions, clicks, reach, conversations, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
         ON CONFLICT (client_id, ad_id, metric_date) DO UPDATE SET spend = EXCLUDED.spend,
           impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks, reach = EXCLUDED.reach,
           conversations = EXCLUDED.conversations, updated_at = now()`,
        [cuid(), clientId, ad.adId, ad.adName, ad.adsetId, ad.adsetName, ad.campaignId, ad.campaignName,
          day, spend, impressions, clicks, Math.round(impressions * 0.7), conversations],
      );
      const agg = byCampaign.get(ad.campaignId) ?? { name: ad.campaignName, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      agg.spend += spend; agg.impressions += impressions; agg.clicks += clicks; agg.conversions += conversations;
      byCampaign.set(ad.campaignId, agg);
    }
    for (const [campaignId, agg] of byCampaign) {
      await db.query('DELETE FROM campaign_metrics WHERE client_id = $1 AND campaign_id = $2 AND metric_date = $3', [clientId, campaignId, day]);
      await db.query(
        `INSERT INTO campaign_metrics (id, client_id, channel, campaign_name, campaign_id, metric_date, spend,
           impressions, clicks, conversions, revenue_attributed, updated_at)
         VALUES ($1,$2,'META_ADS',$3,$4,$5,$6,$7,$8,$9,0,now())`,
        [cuid(), clientId, agg.name, campaignId, day, Math.round(agg.spend * 100) / 100, agg.impressions, agg.clicks, agg.conversions],
      );
    }
  }
}

async function main() {
  const saved = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf-8')) : {};
  const db = new Client({ connectionString: DB });
  await db.connect();
  try {
    saved.superAdmin = await ensureSuperAdmin(db, saved);
    fs.writeFileSync(OUT, JSON.stringify(saved, null, 2));

    const auth = must(await api('POST', '/admin/authenticate', { body: saved.superAdmin }), 'login super admin');
    const { session_token: token, session_id: sessionId } = auth;
    if (!token) throw new Error(`login sem token: ${JSON.stringify(Object.keys(auth))}`);

    if (!saved.tenantId) {
      const tenant = must(await api('POST', '/tenants', { token, sessionId, body: TENANT }), 'criar tenant');
      saved.tenantId = tenant.id ?? tenant.data?.id;
      fs.writeFileSync(OUT, JSON.stringify(saved, null, 2));
    }

    if (!saved.clientId) {
      const hotelLogin = { email: 'hotel@demo.local', password: strongPassword() };
      const client = must(await api('POST', '/admin/hotel-portal/clients', {
        token,
        sessionId,
        tenantId: saved.tenantId,
        body: {
          tenant_id: saved.tenantId,
          email: hotelLogin.email,
          password: hotelLogin.password,
          hotel_name: 'Pousada Demo Reserve',
          country: 'BR',
          booking_engine: 'MANUAL',
          target_occupancy: 0.75,
          target_direct_pct: 0.4,
          contract_start: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
        },
      }), 'criar hotel client');
      saved.clientId = client.id ?? client.data?.id;
      saved.hotelLogin = hotelLogin;
      fs.writeFileSync(OUT, JSON.stringify(saved, null, 2));
    }

    if (!saved.botKey) {
      const config = must(await api('POST', `/admin/hotel-portal/${saved.tenantId}/bot-integration-config`, {
        token,
        sessionId,
        tenantId: saved.tenantId,
        body: { bot_tenant_ref: BOT_REF },
      }), 'criar bot integration config');
      saved.botKey = config.tenant_key ?? config.data?.tenant_key;
      saved.botTenantRef = BOT_REF;
      fs.writeFileSync(OUT, JSON.stringify(saved, null, 2));
    }

    await seedAdSpend(db, saved.clientId);

    console.log('Hotel demo pronto.');
    console.log(`  tenant:   ${saved.tenantId} (${TENANT.slug})`);
    console.log(`  client:   ${saved.clientId}`);
    console.log(`  bot ref:  ${saved.botTenantRef}`);
    console.log(`  logins e chave do bot em ${OUT}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
