/*
  Warnings:

  - A unique constraint covering the columns `[slug,tenant_id]` on the table `LeadCollection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LeadCollection_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "LeadCollection_slug_tenant_id_key" ON "LeadCollection"("slug", "tenant_id");
