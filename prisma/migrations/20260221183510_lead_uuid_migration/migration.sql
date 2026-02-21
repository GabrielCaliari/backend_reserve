/*
  Lead UUID Migration
  
  This migration converts the Lead table's primary key from INT to UUID,
  preserving existing data by:
  1. Adding temporary UUID columns
  2. Generating UUIDs for existing records
  3. Updating foreign key references
  4. Swapping old columns with new ones
*/

-- Step 1: Add temporary UUID columns
ALTER TABLE "Lead" ADD COLUMN "id_uuid" UUID;
ALTER TABLE "lead_attachments" ADD COLUMN "lead_id_uuid" UUID;

-- Step 2: Generate UUIDs for existing Lead records
UPDATE "Lead" SET "id_uuid" = gen_random_uuid();

-- Step 3: Update lead_attachments with corresponding UUIDs
UPDATE "lead_attachments" la
SET "lead_id_uuid" = l."id_uuid"
FROM "Lead" l
WHERE la."lead_id" = l."id";

-- Step 4: Make UUID columns NOT NULL
ALTER TABLE "Lead" ALTER COLUMN "id_uuid" SET NOT NULL;
ALTER TABLE "lead_attachments" ALTER COLUMN "lead_id_uuid" SET NOT NULL;

-- Step 5: Drop foreign key constraint
ALTER TABLE "lead_attachments" DROP CONSTRAINT IF EXISTS "lead_attachments_lead_id_fkey";

-- Step 6: Drop old primary key and columns
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_pkey";
ALTER TABLE "Lead" DROP COLUMN "id";
ALTER TABLE "lead_attachments" DROP COLUMN "lead_id";

-- Step 7: Rename UUID columns to final names
ALTER TABLE "Lead" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "lead_attachments" RENAME COLUMN "lead_id_uuid" TO "lead_id";

-- Step 8: Add new primary key
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pkey" PRIMARY KEY ("id");

-- Step 9: Recreate foreign key constraint
ALTER TABLE "lead_attachments" 
  ADD CONSTRAINT "lead_attachments_lead_id_fkey" 
  FOREIGN KEY ("lead_id") 
  REFERENCES "Lead"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Step 10: Recreate index
CREATE INDEX IF NOT EXISTS "lead_attachments_lead_id_idx" ON "lead_attachments"("lead_id");
