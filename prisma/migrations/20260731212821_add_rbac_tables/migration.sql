/*
  Warnings:

  - You are about to drop the `ActivationToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EPermissionEffect" AS ENUM ('allow', 'deny');

-- DropTable
DROP TABLE "ActivationToken";

-- CreateTable
CREATE TABLE "permissions" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" VARCHAR(25) NOT NULL,
    "role" "EAdminRole" NOT NULL,
    "permission_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permission_overrides" (
    "id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "permission_id" VARCHAR(25) NOT NULL,
    "effect" VARCHAR(5) NOT NULL,
    "created_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role", "permission_id");

-- CreateIndex
CREATE INDEX "admin_permission_overrides_admin_id_tenant_id_idx" ON "admin_permission_overrides"("admin_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permission_overrides_admin_id_tenant_id_permission_id_key" ON "admin_permission_overrides"("admin_id", "tenant_id", "permission_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
