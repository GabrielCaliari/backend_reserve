-- Create b2c_checkout_sessions table
-- Tracks all B2C checkout attempts (pending, completed, expired, abandoned)
-- Created when checkout starts, updated via Stripe webhooks

CREATE TABLE "b2c_checkout_sessions" (
  "id"                    VARCHAR(25)   NOT NULL,
  "tenant_id"             VARCHAR(25)   NOT NULL,
  "user_id"               VARCHAR(25),
  "product_id"            VARCHAR(25)   NOT NULL,
  "price_id"              VARCHAR(25)   NOT NULL,
  "stripe_checkout_id"    VARCHAR(200)  NOT NULL,
  "stripe_price_id"       VARCHAR(100)  NOT NULL,
  "status"                VARCHAR(20)   NOT NULL DEFAULT 'pending',
  "amount"                INTEGER       NOT NULL,
  "currency"              VARCHAR(3)    NOT NULL DEFAULT 'brl',
  "customer_email"        VARCHAR(255)  NOT NULL,
  "customer_name"         VARCHAR(255),
  "customer_phone"        VARCHAR(50),
  "is_lead_purchase"      BOOLEAN       NOT NULL DEFAULT false,
  "checkout_started_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkout_completed_at" TIMESTAMP(3),
  "checkout_expired_at"   TIMESTAMP(3),
  "metadata"              JSONB,
  "created_at"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "b2c_checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "b2c_checkout_sessions_stripe_checkout_id_key"
  ON "b2c_checkout_sessions"("stripe_checkout_id");

CREATE INDEX "b2c_checkout_sessions_tenant_id_idx"
  ON "b2c_checkout_sessions"("tenant_id");

CREATE INDEX "b2c_checkout_sessions_tenant_id_status_idx"
  ON "b2c_checkout_sessions"("tenant_id", "status");

CREATE INDEX "b2c_checkout_sessions_tenant_id_customer_email_idx"
  ON "b2c_checkout_sessions"("tenant_id", "customer_email");

CREATE INDEX "b2c_checkout_sessions_stripe_checkout_id_idx"
  ON "b2c_checkout_sessions"("stripe_checkout_id");

ALTER TABLE "b2c_checkout_sessions"
  ADD CONSTRAINT "b2c_checkout_sessions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "b2c_checkout_sessions"
  ADD CONSTRAINT "b2c_checkout_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
