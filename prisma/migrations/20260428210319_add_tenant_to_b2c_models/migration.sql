/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,stripe_price_id]` on the table `b2c_product_prices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,stripe_product_id]` on the table `b2c_products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,slug]` on the table `b2c_products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,stripe_subscription_id]` on the table `b2c_user_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `b2c_product_prices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `b2c_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `b2c_user_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "b2c_product_prices_stripe_price_id_key";

-- DropIndex
DROP INDEX "b2c_products_active_idx";

-- DropIndex
DROP INDEX "b2c_products_slug_idx";

-- DropIndex
DROP INDEX "b2c_products_slug_key";

-- DropIndex
DROP INDEX "b2c_products_stripe_product_id_key";

-- DropIndex
DROP INDEX "b2c_user_subscriptions_stripe_subscription_id_idx";

-- DropIndex
DROP INDEX "b2c_user_subscriptions_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "b2c_product_prices" ADD COLUMN     "tenant_id" VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE "b2c_products" ADD COLUMN     "tenant_id" VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE "b2c_user_subscriptions" ADD COLUMN     "tenant_id" VARCHAR(25) NOT NULL;

-- CreateIndex
CREATE INDEX "b2c_product_prices_tenant_id_idx" ON "b2c_product_prices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_product_prices_tenant_id_stripe_price_id_key" ON "b2c_product_prices"("tenant_id", "stripe_price_id");

-- CreateIndex
CREATE INDEX "b2c_products_tenant_id_idx" ON "b2c_products"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_products_tenant_id_active_idx" ON "b2c_products"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_tenant_id_stripe_product_id_key" ON "b2c_products"("tenant_id", "stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_tenant_id_slug_key" ON "b2c_products"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "b2c_user_subscriptions_tenant_id_idx" ON "b2c_user_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_user_subscriptions_tenant_id_user_id_status_idx" ON "b2c_user_subscriptions"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_user_subscriptions_tenant_id_stripe_subscription_id_key" ON "b2c_user_subscriptions"("tenant_id", "stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "b2c_products" ADD CONSTRAINT "b2c_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_product_prices" ADD CONSTRAINT "b2c_product_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_subscriptions" ADD CONSTRAINT "b2c_user_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
