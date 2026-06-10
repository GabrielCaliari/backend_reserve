-- CreateTable
CREATE TABLE "TenantTypeModulePolicy" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_type" "ETenantType" NOT NULL,
    "module_key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTypeModulePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantTypeModulePolicy_tenant_type_module_key_key" ON "TenantTypeModulePolicy"("tenant_type", "module_key");

-- CreateIndex
CREATE INDEX "TenantTypeModulePolicy_tenant_type_enabled_idx" ON "TenantTypeModulePolicy"("tenant_type", "enabled");
