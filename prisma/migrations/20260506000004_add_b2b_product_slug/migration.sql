-- Add slug column to b2b_products
-- Step 1: Add column as nullable first (to avoid issues with existing rows)
ALTER TABLE "b2b_products"
  ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100);

-- Step 2: Backfill existing rows with a unique slug derived from id
-- Format: product-{first 8 chars of id}
UPDATE "b2b_products"
SET "slug" = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id, 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

-- Step 3: Make column NOT NULL now that all rows have a value
ALTER TABLE "b2b_products"
  ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Create unique index (tenant_id + slug)
CREATE UNIQUE INDEX IF NOT EXISTS "b2b_products_tenant_id_slug_key" ON "b2b_products"("tenant_id", "slug");
