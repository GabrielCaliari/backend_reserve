import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

function readMigration(folder: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
}

describe('20260728000002_add_tenant_domain', () => {
  const sql = readMigration('20260728000002_add_tenant_domain');

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

describe('20260728000003_add_tenant_setting', () => {
  const sql = readMigration('20260728000003_add_tenant_setting');

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
