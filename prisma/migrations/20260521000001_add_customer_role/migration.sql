-- Create enum if not exists
DO $$ BEGIN
  CREATE TYPE "ECustomerRole" AS ENUM ('study', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "role" "ECustomerRole" NOT NULL DEFAULT 'study';
