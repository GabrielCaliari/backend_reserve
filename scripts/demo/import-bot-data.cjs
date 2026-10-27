/**
 * Copia as conversas REAIS do bot (as que o n8n ja mandou para a API de
 * producao) para o banco local de demonstracao, no tenant da Pousada Demo.
 *
 * Na origem so roda SELECT. No destino apaga o que o simulador inventou para
 * o tenant demo (a menos de --manter) e insere as linhas reais com o
 * tenant_id trocado pelo do demo. Ids, numeros, datas e textos vem iguais.
 *
 * Uso:
 *   node scripts/demo/import-bot-data.cjs                 # lista os tenants com dado de bot na origem
 *   node scripts/demo/import-bot-data.cjs --tenant cli_x  # importa (slug do tenant ou bot_tenant_ref)
 *   node scripts/demo/import-bot-data.cjs --tenant cli_x --manter
 *
 * Origem: SOURCE_DATABASE_URL, senao DATABASE_URL do .env (producao, leitura).
 * Destino: DEMO_DATABASE_URL, senao o reserve_demo local. Recusa destino nao local.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : null;
};
const TENANT = flag('--tenant');
const MANTER = args.includes('--manter');

const SOURCE = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const DEST = process.env.DEMO_DATABASE_URL || 'postgresql://test:test@127.0.0.1:15432/reserve_demo';
if (!/127\.0\.0\.1|localhost/.test(DEST)) {
  console.error('Recusado: o destino nao e um banco local.');
  process.exit(1);
}
if (!SOURCE) {
  console.error('Sem origem: defina SOURCE_DATABASE_URL ou DATABASE_URL.');
  process.exit(1);
}

const demoFile = path.join(__dirname, '.demo-hotel.local.json');
const demo = JSON.parse(fs.readFileSync(demoFile, 'utf8'));

// Tabelas projetadas pelo bot, na ordem de insercao. Todas tem tenant_id.
const TABLES = [
  'bot_contacts',
  'bot_messages',
  'funil_eventos',
  'bot_leads',
  'bot_issues',
  'bot_feedbacks',
  'bot_reservas',
  'bot_followup_attempts',
];

async function main() {
  const src = new Client({ connectionString: SOURCE });
  await src.connect();

  const tenants = (
    await src.query(`
      select t.id, t.slug, b.bot_tenant_ref, b.last_heartbeat_at, b.last_heartbeat_data,
             (select count(*) from bot_contacts c where c.tenant_id = t.id) as contatos,
             (select count(*) from bot_messages m where m.tenant_id = t.id) as mensagens,
             (select max(m.ocorrido_em) from bot_messages m where m.tenant_id = t.id) as ultima_mensagem
      from "Tenant" t
      join bot_integration_configs b on b.tenant_id = t.id
      order by contatos desc`)
  ).rows;

  if (!TENANT) {
    console.log('Tenants com integracao de bot na origem:');
    for (const t of tenants) {
      console.log(
        `  ${t.slug.padEnd(24)} ref=${String(t.bot_tenant_ref).padEnd(22)} contatos=${t.contatos} mensagens=${t.mensagens} ultima=${t.ultima_mensagem ? new Date(t.ultima_mensagem).toISOString() : '-'}`,
      );
    }
    console.log('\nRode de novo com --tenant <slug ou ref>.');
    await src.end();
    return;
  }

  const origem = tenants.find((t) => t.slug === TENANT || t.bot_tenant_ref === TENANT);
  if (!origem) {
    console.error(`Tenant "${TENANT}" nao encontrado na origem.`);
    await src.end();
    process.exit(1);
  }

  const dst = new Client({ connectionString: DEST });
  await dst.connect();
  await dst.query('begin');
  try {
    if (!MANTER) {
      for (const table of [...TABLES].reverse()) {
        const r = await dst.query(`delete from ${table} where tenant_id = $1`, [demo.tenantId]);
        console.log(`limpou ${table}: ${r.rowCount}`);
      }
    }

    const existentes = new Set(
      (await src.query("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name),
    );
    for (const table of TABLES) {
      if (!existentes.has(table)) {
        console.log(table + ': nao existe na origem (migration ainda nao aplicada), pulando');
        continue;
      }
      const { rows } = await src.query(`select * from ${table} where tenant_id = $1`, [origem.id]);
      let inseridas = 0;
      for (const row of rows) {
        row.tenant_id = demo.tenantId;
        const cols = Object.keys(row);
        const vals = cols.map((c) => {
          const v = row[c];
          return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
        });
        const r = await dst.query(
          `insert into ${table} (${cols.map((c) => `"${c}"`).join(',')})
           values (${cols.map((_, i) => `$${i + 1}`).join(',')})
           on conflict do nothing`,
          vals,
        );
        inseridas += r.rowCount;
      }
      console.log(`${table}: ${rows.length} na origem, ${inseridas} inseridas`);
    }

    // O ultimo heartbeat real, para o cartao do canal nao dizer "sem sinal".
    await dst.query(
      `update bot_integration_configs set last_heartbeat_at = $2, last_heartbeat_data = $3 where tenant_id = $1`,
      [demo.tenantId, origem.last_heartbeat_at, origem.last_heartbeat_data],
    );

    await dst.query('commit');
    console.log(`\nPronto: conversas de "${origem.slug}" agora aparecem na Pousada Demo.`);
  } catch (e) {
    await dst.query('rollback');
    throw e;
  } finally {
    await dst.end();
    await src.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
