-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "type" VARCHAR(10) NOT NULL DEFAULT 'domain',
    "value" VARCHAR(500) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_value_key" ON "TenantDomain"("value");

-- CreateIndex
CREATE INDEX "TenantDomain_tenant_id_idx" ON "TenantDomain"("tenant_id");

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: promote the single legacy Tenant.domain value to a primary
-- TenantDomain row. Value is normalized (lowercased, scheme and trailing slash
-- stripped) because CorsOriginService stores bare hosts. TenantDomain.value is
-- UNIQUE and two tenants may share a domain today, so DISTINCT ON keeps the
-- oldest tenant deterministically; any loser is reported by the audit query
-- below and re-added by hand as a regex/extra domain if it is legitimate.
INSERT INTO "TenantDomain" ("id", "tenant_id", "type", "value", "is_primary", "active", "created_at", "updated_at")
SELECT DISTINCT ON (normalized.value)
    'c' || substr(md5(random()::text || normalized.tenant_id), 1, 24),
    normalized.tenant_id,
    'domain',
    normalized.value,
    true,
    true,
    NOW(),
    NOW()
FROM (
    SELECT
        t."id" AS tenant_id,
        t."created_at" AS created_at,
        regexp_replace(
            regexp_replace(lower(btrim(t."domain")), '^https?://', ''),
            '/+$', ''
        ) AS value
    FROM "Tenant" t
    WHERE t."domain" IS NOT NULL AND btrim(t."domain") <> ''
) AS normalized
WHERE normalized.value <> ''
ORDER BY normalized.value, normalized.created_at ASC;

-- AlterTable: keep the legacy column (the tenant payload the dashboard reads
-- still exposes it) but drop NOT NULL. TenantRepository.create already writes
-- `domain: data.domain ?? null`, which fails today against a NOT NULL column.
ALTER TABLE "Tenant" ALTER COLUMN "domain" DROP NOT NULL;
