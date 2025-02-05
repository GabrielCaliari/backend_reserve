-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "string_plan_id" TEXT NOT NULL,
    "string_plan_nickname" TEXT,
    "string_plan_amount" INTEGER NOT NULL,
    "string_plan_currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_end" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "billing_cycle_anchor" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "default_payment_method" TEXT,
    "auto_renew" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tax_percent" DOUBLE PRECISION,
    "discount" JSONB,
    "latest_invoice_id" TEXT,
    "next_invoice_date" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "created_from_webhook" BOOLEAN NOT NULL,
    "event_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscription_id_key" ON "Subscription"("subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_subscription_id_idx" ON "Subscription"("subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_customer_id_idx" ON "Subscription"("customer_id");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
