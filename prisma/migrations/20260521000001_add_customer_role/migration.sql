-- ECustomerRole enum already exists in database
-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "role" "ECustomerRole" NOT NULL DEFAULT 'study';
