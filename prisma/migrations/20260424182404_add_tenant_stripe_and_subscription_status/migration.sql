-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stripe_customer_id" VARCHAR(255),
ADD COLUMN     "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "Tenant_stripe_customer_id_idx" ON "Tenant"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "Tenant_subscription_status_idx" ON "Tenant"("subscription_status");
