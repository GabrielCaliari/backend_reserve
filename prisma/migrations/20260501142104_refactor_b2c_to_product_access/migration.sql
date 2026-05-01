-- ============================================
-- B2C Refactor: UserSubscription → UserProductAccess
-- Adds 4 billing modes: unlimited, limited, one_time, one_time_exp
-- ============================================

-- Step 1: Update ProductPrice table (add new fields with defaults)
-- Add nullable first, then set defaults, then make NOT NULL
ALTER TABLE "b2c_product_prices"
ADD COLUMN IF NOT EXISTS "name" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "billing_mode" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "max_billing_cycles" INT,
ADD COLUMN IF NOT EXISTS "access_duration_days" INT;

-- Set default values for existing rows
UPDATE "b2c_product_prices"
SET "name" = 'Default'
WHERE "name" IS NULL;

UPDATE "b2c_product_prices"
SET "billing_mode" = 'unlimited'
WHERE "billing_mode" IS NULL;

-- Now make them NOT NULL with defaults
ALTER TABLE "b2c_product_prices"
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Default',
ALTER COLUMN "billing_mode" SET NOT NULL,
ALTER COLUMN "billing_mode" SET DEFAULT 'unlimited';

-- Make interval nullable for one_time modes
ALTER TABLE "b2c_product_prices"
ALTER COLUMN "interval" DROP NOT NULL;

-- Add index for billing_mode
CREATE INDEX IF NOT EXISTS "b2c_product_prices_tenant_billing_mode_idx" 
ON "b2c_product_prices"("tenant_id", "billing_mode");

-- Step 2: Rename UserSubscription table
ALTER TABLE "b2c_user_subscriptions" RENAME TO "b2c_user_product_access";

-- Step 3: Add new columns to UserProductAccess
ALTER TABLE "b2c_user_product_access"
ADD COLUMN IF NOT EXISTS "access_type" VARCHAR(20) NOT NULL DEFAULT 'subscription',
ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "access_granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "max_billing_cycles" INT,
ADD COLUMN IF NOT EXISTS "completed_billing_cycles" INT NOT NULL DEFAULT 0;

-- Step 4: Make subscription fields nullable (for one_time modes)
ALTER TABLE "b2c_user_product_access"
ALTER COLUMN "stripe_subscription_id" DROP NOT NULL,
ALTER COLUMN "current_period_start" DROP NOT NULL,
ALTER COLUMN "current_period_end" DROP NOT NULL;

-- Step 5: Add new indexes
CREATE INDEX IF NOT EXISTS "b2c_user_product_access_access_type_status_idx" 
ON "b2c_user_product_access"("access_type", "status");

CREATE INDEX IF NOT EXISTS "b2c_user_product_access_user_product_status_idx" 
ON "b2c_user_product_access"("user_id", "product_id", "status");

-- Step 6: Update Tenant relation name (if needed)
-- No SQL needed - this is just a Prisma relation name change

-- Step 7: Update User relation name (if needed)
-- No SQL needed - this is just a Prisma relation name change
