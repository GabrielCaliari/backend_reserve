import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

function readMigration(folder: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
}

describe('20260801000002_add_tenant_domain', () => {
  const sql = readMigration('20260801000002_add_tenant_domain');

  it('creates the TenantDomain table in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "TenantDomain"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"is_primary" BOOLEAN NOT NULL DEFAULT false');
    expect(sql).toContain('"created_at"');
    expect(sql).toContain('"updated_at"');
    expect(sql).not.toMatch(/"tenantId"|"isPrimary"|"createdAt"/);
  });

  it('enforces a unique value and indexes tenant_id', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "TenantDomain_value_key"');
    expect(sql).toContain('CREATE INDEX "TenantDomain_tenant_id_idx"');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/TenantDomain_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });

  it('backfills a primary row from the existing Tenant.domain column', () => {
    expect(sql).toContain('INSERT INTO "TenantDomain"');
    expect(sql).toContain('FROM "Tenant"');
    // is_primary true for the migrated value
    expect(sql).toMatch(/INSERT INTO "TenantDomain"[\s\S]*true/);
  });

  it('normalizes scheme and trailing slash while backfilling', () => {
    expect(sql).toContain('regexp_replace');
    expect(sql).toContain("'^https?://'");
  });

  it('deduplicates domains shared by more than one tenant', () => {
    expect(sql).toContain('DISTINCT ON');
  });

  it('keeps Tenant.domain but relaxes NOT NULL for backward compatibility', () => {
    expect(sql).toContain('ALTER TABLE "Tenant" ALTER COLUMN "domain" DROP NOT NULL');
    expect(sql).not.toContain('DROP COLUMN "domain"');
  });
});

describe('20260801000003_add_tenant_setting', () => {
  const sql = readMigration('20260801000003_add_tenant_setting');

  it('creates TenantSetting with a JSONB value in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "TenantSetting"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"value" JSONB NOT NULL');
    expect(sql).toContain('"updated_by" VARCHAR(25)');
    expect(sql).not.toMatch(/"tenantId"|"updatedBy"/);
  });

  it('enforces one row per tenant/module/key', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "TenantSetting_tenant_id_module_key_key"');
    expect(sql).toContain('CREATE INDEX "TenantSetting_tenant_id_module_idx"');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/TenantSetting_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });
});

describe('20260804000001_add_attribution_tables', () => {
  const sql = readMigration('20260804000001_add_attribution_tables');

  it('creates atribuicao_conversa and attribution_settings in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "atribuicao_conversa"');
    expect(sql).toContain('CREATE TABLE "attribution_settings"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"ctwa_clid"');
    expect(sql).toContain('"link_code"');
    expect(sql).not.toMatch(/"tenantId"|"ctwaClid"|"linkCode"/);
  });

  it('gives attribution_settings one row per tenant', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "attribution_settings_tenant_id_key"');
  });

  it('indexes atribuicao_conversa for contact/date and link_code lookups', () => {
    expect(sql).toContain('atribuicao_conversa_tenant_id_numero_contato_idx');
    expect(sql).toContain('atribuicao_conversa_link_code_idx');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/atribuicao_conversa_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
    expect(sql).toMatch(/attribution_settings_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });
});

describe('20260804000002_add_bot_automation_tables', () => {
  const sql = readMigration('20260804000002_add_bot_automation_tables');

  it('creates all six tables', () => {
    for (const table of [
      'bot_integration_configs',
      'bot_ingestion_events',
      'bot_contacts',
      'bot_messages',
      'funil_eventos',
      'bot_leads',
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it('gives bot_ingestion_events an idempotency key per tenant/event_id', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "bot_ingestion_events_tenant_id_event_id_key"');
  });

  it('gives bot_contacts and bot_leads one row per tenant/contact', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "bot_contacts_tenant_id_numero_contato_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "bot_leads_tenant_id_numero_contato_key"');
  });

  it('keeps funil_eventos append-only: no unique constraint on (tenant_id, numero_contato)', () => {
    const funilBlockMatch = sql.match(
      /CREATE TABLE "funil_eventos"[\s\S]*?(?=-- Create|$)/,
    );
    expect(funilBlockMatch).not.toBeNull();
    // Every CREATE UNIQUE INDEX anywhere in this migration must NOT target
    // funil_eventos — the schema-level encoding of "always INSERT, never
    // UPDATE" for the append-only funnel log.
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX "funil_eventos[^"]*"/);
  });
});

describe('20260818000001_add_motor_tables', () => {
  const sql = readMigration('20260818000001_add_motor_tables');

  it('creates the twelve motor tables', () => {
    for (const table of [
      'motor_room_types',
      'motor_units',
      'motor_cancellation_policies',
      'motor_rate_plans',
      'motor_seasons',
      'motor_price_rules',
      'motor_daily_inventory',
      'motor_reservations',
      'motor_reservation_events',
      'motor_holds',
      'motor_blocks',
      'motor_payment_exceptions',
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it('enables btree_gist and adds both exclusion constraints (guarda anti-overbooking, spec §1.2)', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(sql).toContain('"motor_holds_no_overlap"');
    expect(sql).toContain('"motor_reservations_no_overlap"');
    expect(sql).toMatch(/EXCLUDE USING gist[\s\S]*?daterange\(checkin, checkout, '\[\)'\)/);
  });

  it('materializes one calendar row per tenant/room_type/date', () => {
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "motor_daily_inventory_tenant_id_room_type_id_data_key"',
    );
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/motor_room_types_tenant_id_fkey[\s\S]*?ON DELETE CASCADE/);
    expect(sql).toMatch(/motor_reservations_tenant_id_fkey[\s\S]*?ON DELETE CASCADE/);
  });

  it('adds the motor webhook url to bot_integration_configs', () => {
    expect(sql).toContain('ALTER TABLE "bot_integration_configs" ADD COLUMN "n8n_motor_webhook_url"');
  });
});

describe('20260818000002_add_channel_sync_tables', () => {
  const sql = readMigration('20260818000002_add_channel_sync_tables');

  it('creates the two channel sync tables (beds24, fase 2)', () => {
    expect(sql).toContain('CREATE TABLE "motor_channel_sync_states"');
    expect(sql).toContain('CREATE TABLE "motor_channel_push_queue"');
  });

  it('keeps one sync state per tenant (unique de tenant_id)', () => {
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "motor_channel_sync_states_tenant_id_key" ON "motor_channel_sync_states"("tenant_id")',
    );
  });

  it('indexes the queue drain path by [status, not_before]', () => {
    expect(sql).toContain(
      'CREATE INDEX "motor_channel_push_queue_status_not_before_idx" ON "motor_channel_push_queue"("status", "not_before")',
    );
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/motor_channel_sync_states_tenant_id_fkey[\s\S]*?ON DELETE CASCADE/);
    expect(sql).toMatch(/motor_channel_push_queue_tenant_id_fkey[\s\S]*?ON DELETE CASCADE/);
  });
});

describe('20260930000001_bot_contract_v2', () => {
  const sql = readMigration('20260930000001_bot_contract_v2');

  it('amplia o status do contato para os 10 estados do contrato', () => {
    for (const estado of [
      'VERIFICANDO', 'AGUARDANDO_FICHA', 'AGUARDANDO_PAGAMENTO', 'EM_CONFIRMACAO',
      'PAUSADO_HUMANO', 'FECHADO', 'EM_ESTADIA', 'FRIO',
    ]) {
      expect(sql).toContain(`ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS '${estado}'`);
    }
  });

  it('cria o outbox de acoes do painel', () => {
    expect(sql).toContain('CREATE TABLE "bot_panel_actions"');
    expect(sql).toContain('CREATE INDEX "bot_panel_actions_tenant_id_status_idx"');
  });

  it('identificador do bot por tenant e unico', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "bot_integration_configs_bot_tenant_ref_key"');
  });

  it('guarda hold e etiquetas no lead, em centavos', () => {
    expect(sql).toContain('"hold_valor_cents" INTEGER');
    expect(sql).toContain('"valor_confirmado_cents" INTEGER NOT NULL DEFAULT 0');
    expect(sql).toContain('"recuperar" BOOLEAN NOT NULL DEFAULT false');
  });

  it('nao remove nada (a limpeza e outra migration)', () => {
    expect(sql).not.toMatch(/DROP (TABLE|COLUMN)/);
  });
});

describe('20260930000002_bot_contract_v2_cleanup', () => {
  const sql = readMigration('20260930000002_bot_contract_v2_cleanup');

  it('remove o que o contrato v2 substituiu', () => {
    expect(sql).toContain('DROP COLUMN "chatwoot_base_url"');
    expect(sql).toContain('DROP COLUMN "n8n_stage_webhook_url"');
    expect(sql).toContain('DROP COLUMN "n8n_config_publish_webhook_url"');
    expect(sql).toContain('DROP TABLE "bot_stage_webhook_dispatches"');
  });

  it('nao toca no webhook do motor de reservas', () => {
    expect(sql).not.toContain('n8n_motor_webhook_url');
  });
});
