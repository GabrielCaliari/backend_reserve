-- Add tenant_id to ActivationToken for tenant-scoped onboarding
ALTER TABLE "ActivationToken" ADD COLUMN IF NOT EXISTS "tenant_id" VARCHAR(25);

-- Indexes for tenant-aware lookups
CREATE INDEX IF NOT EXISTS "ActivationToken_tenant_id_idx" ON "ActivationToken"("tenant_id");
CREATE INDEX IF NOT EXISTS "ActivationToken_user_id_tenant_id_type_idx" ON "ActivationToken"("user_id", "tenant_id", "type");
