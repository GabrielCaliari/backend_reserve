-- Add fee override columns to b2b_products
-- All nullable — existing products are not affected
ALTER TABLE "b2b_products"
  ADD COLUMN "category_id"           VARCHAR(25)      DEFAULT NULL,
  ADD COLUMN "chip_cost_override"    DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN "shipping_fee_override" INTEGER          DEFAULT NULL,
  ADD COLUMN "requires_shipping"     BOOLEAN          NOT NULL DEFAULT false;

CREATE INDEX "b2b_products_tenant_id_category_id_idx" ON "b2b_products"("tenant_id", "category_id");

ALTER TABLE "b2b_products"
  ADD CONSTRAINT "b2b_products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "b2c_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
