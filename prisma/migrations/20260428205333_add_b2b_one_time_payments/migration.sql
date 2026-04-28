-- CreateTable
CREATE TABLE "b2b_products" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_product_id" VARCHAR(100) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_purchases" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25),
    "product_id" VARCHAR(25) NOT NULL,
    "stripe_checkout_id" VARCHAR(200),
    "stripe_payment_intent" VARCHAR(200),
    "checkout_started_at" TIMESTAMPTZ,
    "checkout_completed_at" TIMESTAMPTZ,
    "checkout_abandoned_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_stripe_product_id_key" ON "b2b_products"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_stripe_price_id_key" ON "b2b_products"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_stripe_checkout_id_key" ON "b2b_purchases"("stripe_checkout_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_stripe_payment_intent_key" ON "b2b_purchases"("stripe_payment_intent");

-- CreateIndex
CREATE INDEX "b2b_purchases_user_id_idx" ON "b2b_purchases"("user_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_product_id_idx" ON "b2b_purchases"("product_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_status_idx" ON "b2b_purchases"("status");

-- CreateIndex
CREATE INDEX "b2b_purchases_customer_email_idx" ON "b2b_purchases"("customer_email");

-- CreateIndex
CREATE INDEX "b2b_purchases_created_at_idx" ON "b2b_purchases"("created_at");

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2b_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
