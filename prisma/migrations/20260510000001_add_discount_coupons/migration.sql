-- Discount Coupons — Shared B2B + B2C coupon/discount system
-- Supports percentage and fixed_amount discounts scoped to order, product, or category

CREATE TABLE "discount_coupons" (
    "id"                  VARCHAR(25)      NOT NULL,
    "tenant_id"           VARCHAR(25)      NOT NULL,
    "code"                VARCHAR(100)     NOT NULL,
    "name"                VARCHAR(255)     NOT NULL,
    "description"         TEXT,
    "discount_type"       VARCHAR(20)      NOT NULL,
    "discount_value"      DOUBLE PRECISION NOT NULL,  -- % (0-100) for percentage; whole cents for fixed_amount
    "scope"               VARCHAR(20)      NOT NULL,
    "product_ids"         TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
    "category_ids"        TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
    "applies_to"          VARCHAR(20)      NOT NULL,
    "cumulative"          BOOLEAN          NOT NULL DEFAULT false,
    "min_order_amount"    INTEGER,
    "max_discount_amount" INTEGER,
    "max_redemptions"     INTEGER,
    "redeemed_count"      INTEGER          NOT NULL DEFAULT 0,
    "expires_at"          TIMESTAMP(3),
    "active"              BOOLEAN          NOT NULL DEFAULT true,
    "created_at"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "discount_coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discount_coupons_tenant_id_code_key" ON "discount_coupons"("tenant_id", "code");
CREATE INDEX "discount_coupons_tenant_id_idx" ON "discount_coupons"("tenant_id");
CREATE INDEX "discount_coupons_tenant_id_active_idx" ON "discount_coupons"("tenant_id", "active");

ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
