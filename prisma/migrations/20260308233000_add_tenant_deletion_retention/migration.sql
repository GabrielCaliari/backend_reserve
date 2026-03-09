ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletion_scheduled_for_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletion_requested_by" VARCHAR(25),
ADD COLUMN IF NOT EXISTS "deletion_reason" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "Tenant_deletion_scheduled_for_at_idx"
ON "Tenant"("deletion_scheduled_for_at");