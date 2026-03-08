-- CreateEnum
CREATE TYPE "EUserCollectionRole" AS ENUM ('guest', 'member', 'operator');

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollectionMembership" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "collection_id" VARCHAR(25) NOT NULL,
    "role" "EUserCollectionRole" NOT NULL DEFAULT 'member',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollectionMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCollection_tenant_id_idx" ON "UserCollection"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_tenant_id_slug_key" ON "UserCollection"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "UserCollectionMembership_user_id_idx" ON "UserCollectionMembership"("user_id");

-- CreateIndex
CREATE INDEX "UserCollectionMembership_collection_id_idx" ON "UserCollectionMembership"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectionMembership_user_id_collection_id_key" ON "UserCollectionMembership"("user_id", "collection_id");

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMembership" ADD CONSTRAINT "UserCollectionMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMembership" ADD CONSTRAINT "UserCollectionMembership_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "UserCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
