-- CreateTable: stripe_plans
-- Stores Stripe Product+Price pairs created via the admin panel.
-- Replaces the manual workflow of creating products in the Stripe Dashboard
-- and copying price IDs into the database.

CREATE TABLE "stripe_plans" (
    "id"                            VARCHAR(25) NOT NULL,
    "slug"                          VARCHAR(100) NOT NULL,
    "plan_name"                     VARCHAR(100) NOT NULL,
    "description"                   TEXT,

    -- Stripe IDs
    "stripe_product_id"             VARCHAR(255) NOT NULL,
    "stripe_price_id"               VARCHAR(255) NOT NULL,
    "stripe_trial_price_id"         VARCHAR(255),

    -- Billing
    "billing_interval"              SMALLINT NOT NULL,
    "unit_amount"                   INTEGER NOT NULL,
    "currency"                      VARCHAR(3) NOT NULL DEFAULT 'brl',

    -- Credits / limits
    "released_credits"              INTEGER NOT NULL DEFAULT 0,
    "credits_released_trial_period" INTEGER NOT NULL DEFAULT 0,
    "guest_limit"                   INTEGER NOT NULL DEFAULT 0,
    "trial_days"                    SMALLINT NOT NULL DEFAULT 7,

    -- Control
    "active"                        BOOLEAN NOT NULL DEFAULT true,
    "created_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_plans_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "stripe_plans_slug_key"               ON "stripe_plans"("slug");
CREATE UNIQUE INDEX "stripe_plans_stripe_product_id_key"  ON "stripe_plans"("stripe_product_id");
CREATE UNIQUE INDEX "stripe_plans_stripe_price_id_key"    ON "stripe_plans"("stripe_price_id");
CREATE UNIQUE INDEX "stripe_plans_stripe_trial_price_id_key" ON "stripe_plans"("stripe_trial_price_id");

-- Indexes for common queries
CREATE INDEX "stripe_plans_active_idx" ON "stripe_plans"("active");
CREATE INDEX "stripe_plans_slug_idx"   ON "stripe_plans"("slug");
