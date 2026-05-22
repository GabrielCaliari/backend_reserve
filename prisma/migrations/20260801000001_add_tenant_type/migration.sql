-- CreateEnum
CREATE TYPE "ETenantType" AS ENUM ('MASTER', 'COMMON', 'EDUCATIONAL');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "tenant_type" "ETenantType" NOT NULL DEFAULT 'COMMON';

-- CreateIndex
CREATE INDEX "Tenant_tenant_type_idx" ON "Tenant"("tenant_type");
