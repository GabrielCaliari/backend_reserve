-- ============================================================
-- B2C Fee Config: chip cost % e shipping fee global por tenant
-- ============================================================
CREATE TABLE "b2c_fee_config" (
  "id"                VARCHAR(25)      NOT NULL,
  "tenant_id"         VARCHAR(25)      NOT NULL,
  "chip_cost_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shipping_fee"      INTEGER          NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "b2c_fee_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "b2c_fee_config_tenant_id_key" ON "b2c_fee_config"("tenant_id");

ALTER TABLE "b2c_fee_config"
  ADD CONSTRAINT "b2c_fee_config_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Product Categories: taxas por categoria de produto
-- ============================================================
CREATE TABLE "b2c_product_categories" (
  "id"                VARCHAR(25)      NOT NULL,
  "tenant_id"         VARCHAR(25)      NOT NULL,
  "name"              VARCHAR(100)     NOT NULL,
  "slug"              VARCHAR(100)     NOT NULL,
  "chip_cost_percent" DOUBLE PRECISION,          -- null = herda do tenant
  "shipping_fee"      INTEGER,                   -- null = herda do tenant
  "active"            BOOLEAN          NOT NULL DEFAULT true,
  "created_at"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "b2c_product_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "b2c_product_categories_tenant_id_slug_key" ON "b2c_product_categories"("tenant_id", "slug");
CREATE INDEX "b2c_product_categories_tenant_id_idx" ON "b2c_product_categories"("tenant_id");
CREATE INDEX "b2c_product_categories_tenant_id_active_idx" ON "b2c_product_categories"("tenant_id", "active");

ALTER TABLE "b2c_product_categories"
  ADD CONSTRAINT "b2c_product_categories_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Products: adiciona colunas de fee override e categoria
-- Tudo nullable — produtos existentes não são afetados
-- ============================================================
ALTER TABLE "b2c_products"
  ADD COLUMN "category_id"           VARCHAR(25)      DEFAULT NULL,
  ADD COLUMN "chip_cost_override"    DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN "shipping_fee_override" INTEGER          DEFAULT NULL,
  ADD COLUMN "requires_shipping"     BOOLEAN          NOT NULL DEFAULT false;

CREATE INDEX "b2c_products_tenant_id_category_id_idx" ON "b2c_products"("tenant_id", "category_id");

ALTER TABLE "b2c_products"
  ADD CONSTRAINT "b2c_products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "b2c_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
