-- CreateEnum
CREATE TYPE "EBillingInterval" AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

-- CreateEnum
CREATE TYPE "EBillingCollectionMode" AS ENUM ('upfront', 'installments');

-- CreateTable
CREATE TABLE "tenant_billing_configs" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "stripe_publishable_key" VARCHAR(255),
    "stripe_secret_key_hash" VARCHAR(255),
    "stripe_webhook_secret_hash" VARCHAR(255),
    "stripe_price_ids" JSONB,
    "billing_interval" "EBillingInterval" NOT NULL DEFAULT 'monthly',
    "billing_collection_mode" "EBillingCollectionMode" NOT NULL DEFAULT 'upfront',
    "trial_enabled" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" SMALLINT NOT NULL DEFAULT 7,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "plan_name" VARCHAR(100),
    "plan_description" VARCHAR(255),
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_subscriptions" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "stripe_subscription_id" VARCHAR(255) NOT NULL,
    "stripe_customer_id" VARCHAR(255) NOT NULL,
    "stripe_price_id" VARCHAR(255) NOT NULL,
    "stripe_product_id" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "interval" VARCHAR(20) NOT NULL,
    "interval_count" SMALLINT NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "processing_attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_configs_tenant_id_key" ON "tenant_billing_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_billing_configs_tenant_id_idx" ON "tenant_billing_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_subscriptions_tenant_id_key" ON "stripe_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_subscriptions_stripe_subscription_id_key" ON "stripe_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_stripe_subscription_id_idx" ON "stripe_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_stripe_customer_id_idx" ON "stripe_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_tenant_id_status_idx" ON "stripe_subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_status_idx" ON "stripe_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_event_type_processed_idx" ON "stripe_webhook_events"("event_type", "processed");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_created_at_idx" ON "stripe_webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_processed_processing_attempts_idx" ON "stripe_webhook_events"("processed", "processing_attempts");

-- AddForeignKey
ALTER TABLE "tenant_billing_configs" ADD CONSTRAINT "tenant_billing_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
