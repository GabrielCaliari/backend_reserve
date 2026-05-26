-- Make user_id nullable in UserProductAccess.
-- customer_id becomes the source of truth for customer portal purchases.
-- Existing records (user_id populated) remain valid for legacy CRM flows.
ALTER TABLE "b2c_user_product_access" ALTER COLUMN "user_id" DROP NOT NULL;
