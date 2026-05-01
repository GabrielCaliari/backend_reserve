-- Fix b2c_product_prices schema - Add missing columns
-- Run this manually if migration failed

-- Step 1: Add columns as nullable first
ALTER TABLE "b2c_product_prices"
ADD COLUMN IF NOT EXISTS "name" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "billing_mode" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "max_billing_cycles" INT,
ADD COLUMN IF NOT EXISTS "access_duration_days" INT;

-- Step 2: Set default values for existing rows
UPDATE "b2c_product_prices"
SET "name" = 'Default'
WHERE "name" IS NULL;

UPDATE "b2c_product_prices"
SET "billing_mode" = 'unlimited'
WHERE "billing_mode" IS NULL;

-- Step 3: Make columns NOT NULL with defaults
ALTER TABLE "b2c_product_prices"
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Default',
ALTER COLUMN "billing_mode" SET NOT NULL,
ALTER COLUMN "billing_mode" SET DEFAULT 'unlimited';

-- Step 4: Make interval nullable (for one_time modes)
ALTER TABLE "b2c_product_prices"
ALTER COLUMN "interval" DROP NOT NULL;

ALTER TABLE "b2c_product_prices"
ALTER COLUMN "interval_count" DROP NOT NULL;

-- Step 5: Add index
CREATE INDEX IF NOT EXISTS "b2c_product_prices_tenant_billing_mode_idx" 
ON "b2c_product_prices"("tenant_id", "billing_mode");

-- Verify
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'b2c_product_prices'
ORDER BY ordinal_position;
