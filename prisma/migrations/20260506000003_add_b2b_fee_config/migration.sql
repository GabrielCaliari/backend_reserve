-- Create separate fee config table for B2B (one-time) products
-- B2C already has b2c_fee_config — this keeps them isolated per tenant
CREATE TABLE "b2b_fee_config" (
  "id"                VARCHAR(25)      NOT NULL,
  "tenant_id"         VARCHAR(25)      NOT NULL,
  "chip_cost_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shipping_fee"      INTEGER          NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "b2b_fee_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "b2b_fee_config_tenant_id_key" ON "b2b_fee_config"("tenant_id");

ALTER TABLE "b2b_fee_config"
  ADD CONSTRAINT "b2b_fee_config_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
