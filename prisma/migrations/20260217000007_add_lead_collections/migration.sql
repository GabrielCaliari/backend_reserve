-- CreateEnum
CREATE TYPE "ECollectionAccessMode" AS ENUM ('public', 'private', 'restricted');

-- AlterTable
ALTER TABLE "AdminTenant" ALTER COLUMN "role" SET DEFAULT 'manager';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "collection_id" INTEGER;

-- CreateTable
CREATE TABLE "LeadCollection" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "access_mode" "ECollectionAccessMode" NOT NULL DEFAULT 'public',
    "allowed_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret_key_hash" TEXT,
    "secret_key_salt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadCollection_tenant_id_idx" ON "LeadCollection"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCollection_slug_tenant_id_key" ON "LeadCollection"("slug", "tenant_id");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "LeadCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCollection" ADD CONSTRAINT "LeadCollection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
