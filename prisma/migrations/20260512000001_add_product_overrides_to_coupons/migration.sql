-- AlterTable: add product_overrides JSON column to discount_coupons
ALTER TABLE "discount_coupons" ADD COLUMN "product_overrides" JSONB;
