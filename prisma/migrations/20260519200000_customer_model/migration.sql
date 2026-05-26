-- CreateTable: tenant-scoped customer (replaces global User for customer portal)
CREATE TABLE "customers" (
    "id"                 VARCHAR(25) NOT NULL,
    "tenant_id"          VARCHAR(25) NOT NULL,
    "email"              VARCHAR(255) NOT NULL,
    "name"               VARCHAR(100) NOT NULL,
    "phone_number"       VARCHAR(13),
    "stripe_customer_id" VARCHAR(100),
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE INDEX "customers_email_idx" ON "customers"("email");

ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: customer credentials
CREATE TABLE "customer_credentials" (
    "id"          VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "hash"        TEXT NOT NULL,
    "salt"        TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_credentials_customer_id_key" ON "customer_credentials"("customer_id");

ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: customer session tokens
CREATE TABLE "customer_session_tokens" (
    "id"          VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "hash_token"  TEXT NOT NULL,
    "salt"        TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_session_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_session_tokens_customer_id_idx" ON "customer_session_tokens"("customer_id");

ALTER TABLE "customer_session_tokens" ADD CONSTRAINT "customer_session_tokens_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate ActivationToken: drop user_id FK, add customer_id FK
-- (table is new/empty in dev — safe to alter)
ALTER TABLE "ActivationToken" DROP CONSTRAINT IF EXISTS "ActivationToken_user_id_fkey";
ALTER TABLE "ActivationToken" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "ActivationToken" ADD COLUMN "customer_id" VARCHAR(25);
ALTER TABLE "ActivationToken" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Drop old indexes on user_id
DROP INDEX IF EXISTS "ActivationToken_user_id_type_idx";
DROP INDEX IF EXISTS "ActivationToken_user_id_tenant_id_type_idx";

-- Add new indexes on customer_id
CREATE INDEX IF NOT EXISTS "ActivationToken_customer_id_type_idx" ON "ActivationToken"("customer_id", "type");
CREATE INDEX IF NOT EXISTS "ActivationToken_customer_id_tenant_id_type_idx" ON "ActivationToken"("customer_id", "tenant_id", "type");

-- Add FK ActivationToken -> customers
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add customer_id to UserProductAccess (nullable — backward compat with existing user_id records)
ALTER TABLE "b2c_user_product_access" ADD COLUMN IF NOT EXISTS "customer_id" VARCHAR(25);

CREATE INDEX IF NOT EXISTS "b2c_user_product_access_customer_id_idx" ON "b2c_user_product_access"("customer_id");
CREATE INDEX IF NOT EXISTS "b2c_user_product_access_tenant_id_customer_id_status_idx" ON "b2c_user_product_access"("tenant_id", "customer_id", "status");

ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED;
