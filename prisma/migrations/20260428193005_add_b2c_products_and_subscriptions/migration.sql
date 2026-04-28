/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripe_customer_id" VARCHAR(100);

-- CreateTable
CREATE TABLE "b2c_products" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_product_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_product_prices" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "product_id" VARCHAR(25) NOT NULL,
    "interval" VARCHAR(20) NOT NULL,
    "interval_count" SMALLINT NOT NULL DEFAULT 1,
    "unit_amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_user_subscriptions" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "product_id" VARCHAR(25) NOT NULL,
    "product_price_id" VARCHAR(25) NOT NULL,
    "stripe_subscription_id" VARCHAR(100) NOT NULL,
    "stripe_customer_id" VARCHAR(100) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_stripe_product_id_key" ON "b2c_products"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_slug_key" ON "b2c_products"("slug");

-- CreateIndex
CREATE INDEX "b2c_products_active_idx" ON "b2c_products"("active");

-- CreateIndex
CREATE INDEX "b2c_products_slug_idx" ON "b2c_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_product_prices_stripe_price_id_key" ON "b2c_product_prices"("stripe_price_id");

-- CreateIndex
CREATE INDEX "b2c_product_prices_product_id_active_idx" ON "b2c_product_prices"("product_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_user_subscriptions_stripe_subscription_id_key" ON "b2c_user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "b2c_user_subscriptions_user_id_status_idx" ON "b2c_user_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "b2c_user_subscriptions_stripe_subscription_id_idx" ON "b2c_user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "b2c_product_prices" ADD CONSTRAINT "b2c_product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2c_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_subscriptions" ADD CONSTRAINT "b2c_user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_subscriptions" ADD CONSTRAINT "b2c_user_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2c_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_subscriptions" ADD CONSTRAINT "b2c_user_subscriptions_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "b2c_product_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
