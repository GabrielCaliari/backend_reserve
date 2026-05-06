-- Add checkout URL columns to tenant_billing_configs
-- These columns exist in the Prisma schema but were never added via migration
ALTER TABLE "tenant_billing_configs"
  ADD COLUMN IF NOT EXISTS "checkout_success_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "checkout_cancel_url"  VARCHAR(500);
