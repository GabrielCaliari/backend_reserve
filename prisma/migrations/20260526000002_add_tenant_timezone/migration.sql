-- AddColumn timezone to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo';
