-- Add missing columns to b2c_user_product_access
ALTER TABLE "b2c_user_product_access" ADD COLUMN IF NOT EXISTS "access_expires_at" TIMESTAMP(3);
ALTER TABLE "b2c_user_product_access" ADD COLUMN IF NOT EXISTS "access_duration_days" INTEGER;
