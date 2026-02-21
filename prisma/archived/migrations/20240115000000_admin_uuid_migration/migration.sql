-- Admin UUID Migration
-- This migration converts Admin.id from Int to String (UUID/cuid)
-- and updates all foreign key references

-- Step 1: Add temporary UUID columns
ALTER TABLE "Admin" ADD COLUMN "id_uuid" VARCHAR(12);
ALTER TABLE "Article" ADD COLUMN "created_by_uuid" VARCHAR(12);
ALTER TABLE "Article" ADD COLUMN "last_edited_by_uuid" VARCHAR(12);
ALTER TABLE "AdminTenant" ADD COLUMN "admin_id_uuid" VARCHAR(12);
ALTER TABLE "AdminSessionToken" ADD COLUMN "admin_id_uuid" VARCHAR(12);
ALTER TABLE "AdminCredential" ADD COLUMN "admin_id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing Admin records and populate temporary columns
-- This will be done via a data migration script (see migration-data.ts)

-- Step 3: Drop old foreign key constraints
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_created_by_fkey";
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_last_edited_by_fkey";
ALTER TABLE "AdminTenant" DROP CONSTRAINT IF EXISTS "AdminTenant_admin_id_fkey";
ALTER TABLE "AdminSessionToken" DROP CONSTRAINT IF EXISTS "AdminSessionToken_admin_id_fkey";
ALTER TABLE "AdminCredential" DROP CONSTRAINT IF EXISTS "AdminCredential_admin_id_fkey";

-- Step 4: Drop old indexes
DROP INDEX IF EXISTS "Article_created_by_idx";
DROP INDEX IF EXISTS "Article_last_edited_by_idx";
DROP INDEX IF EXISTS "AdminTenant_admin_id_tenant_id_key";
DROP INDEX IF EXISTS "AdminCredential_admin_id_key";

-- Step 5: Drop old columns
ALTER TABLE "Admin" DROP COLUMN "id";
ALTER TABLE "Article" DROP COLUMN "created_by";
ALTER TABLE "Article" DROP COLUMN "last_edited_by";
ALTER TABLE "AdminTenant" DROP COLUMN "admin_id";
ALTER TABLE "AdminSessionToken" DROP COLUMN "admin_id";
ALTER TABLE "AdminCredential" DROP COLUMN "admin_id";

-- Step 6: Rename UUID columns to original names
ALTER TABLE "Admin" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "Article" RENAME COLUMN "created_by_uuid" TO "created_by";
ALTER TABLE "Article" RENAME COLUMN "last_edited_by_uuid" TO "last_edited_by";
ALTER TABLE "AdminTenant" RENAME COLUMN "admin_id_uuid" TO "admin_id";
ALTER TABLE "AdminSessionToken" RENAME COLUMN "admin_id_uuid" TO "admin_id";
ALTER TABLE "AdminCredential" RENAME COLUMN "admin_id_uuid" TO "admin_id";

-- Step 7: Add primary key constraint to Admin.id
ALTER TABLE "Admin" ADD PRIMARY KEY ("id");

-- Step 8: Recreate foreign key constraints
ALTER TABLE "Article" ADD CONSTRAINT "Article_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Article" ADD CONSTRAINT "Article_last_edited_by_fkey" 
  FOREIGN KEY ("last_edited_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminTenant" ADD CONSTRAINT "AdminTenant_admin_id_fkey" 
  FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminSessionToken" ADD CONSTRAINT "AdminSessionToken_admin_id_fkey" 
  FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminCredential" ADD CONSTRAINT "AdminCredential_admin_id_fkey" 
  FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Recreate indexes
CREATE INDEX "Article_created_by_idx" ON "Article"("created_by");
CREATE INDEX "Article_last_edited_by_idx" ON "Article"("last_edited_by");
CREATE UNIQUE INDEX "AdminTenant_admin_id_tenant_id_key" ON "AdminTenant"("admin_id", "tenant_id");
CREATE UNIQUE INDEX "AdminCredential_admin_id_key" ON "AdminCredential"("admin_id");

-- Step 10: Set default for new Admin records
ALTER TABLE "Admin" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
