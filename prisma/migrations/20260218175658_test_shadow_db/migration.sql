/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `LeadCollection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LeadCollection_slug_tenant_id_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "tenant_id" INTEGER;

-- CreateIndex
CREATE INDEX "Lead_tenant_id_idx" ON "Lead"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCollection_slug_key" ON "LeadCollection"("slug");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
