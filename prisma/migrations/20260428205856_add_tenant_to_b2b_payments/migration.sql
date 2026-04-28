/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,stripe_product_id]` on the table `b2b_products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,stripe_price_id]` on the table `b2b_products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,stripe_checkout_id]` on the table `b2b_purchases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,stripe_payment_intent]` on the table `b2b_purchases` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `b2b_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `b2b_purchases` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "b2b_products_stripe_price_id_key";

-- DropIndex
DROP INDEX "b2b_products_stripe_product_id_key";

-- DropIndex
DROP INDEX "b2b_purchases_status_idx";

-- DropIndex
DROP INDEX "b2b_purchases_stripe_checkout_id_key";

-- DropIndex
DROP INDEX "b2b_purchases_stripe_payment_intent_key";

-- AlterTable
ALTER TABLE "b2b_products" ADD COLUMN     "tenant_id" VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE "b2b_purchases" ADD COLUMN     "tenant_id" VARCHAR(25) NOT NULL;

-- CreateIndex
CREATE INDEX "b2b_products_tenant_id_idx" ON "b2b_products"("tenant_id");

-- CreateIndex
CREATE INDEX "b2b_products_tenant_id_active_idx" ON "b2b_products"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_tenant_id_stripe_product_id_key" ON "b2b_products"("tenant_id", "stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_tenant_id_stripe_price_id_key" ON "b2b_products"("tenant_id", "stripe_price_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_tenant_id_idx" ON "b2b_purchases"("tenant_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_tenant_id_status_idx" ON "b2b_purchases"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_tenant_id_stripe_checkout_id_key" ON "b2b_purchases"("tenant_id", "stripe_checkout_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_tenant_id_stripe_payment_intent_key" ON "b2b_purchases"("tenant_id", "stripe_payment_intent");

-- AddForeignKey
ALTER TABLE "b2b_products" ADD CONSTRAINT "b2b_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
